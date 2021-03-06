require("dotenv").config();

const mqtt = require("mqtt");
const Topics = require("../topics");
const ContractManager = require("../../utilities/contracts-manager");
const ProviderManager = require("../../utilities/providers-manager");
const Logger = require("../../utilities/logger");
const Helper = require("../../utilities/helper");
const ClientUtils = require("../client-utilities");
const ReadingsClient = require("../readings-client");

class VGRClient {
  static TASK1 = "GetInfo";
  static TASK2 = "DropToHBW";
  static TASK3 = "MoveHBW2MPO";
  static TASK4 = "PickSorted";

  constructor() {}

  connect() {
    this.clientName = this.constructor.name;
    this.mqttClient = mqtt.connect(process.env.MQTT_BROKER);
    this.mqttClient.on("error", (error) => this.onMQTTError(error));
    this.mqttClient.on("connect", () => this.onMQTTConnect());
    this.mqttClient.on("close", () => this.onMQTTClose());
    this.mqttClient.on("message", (topic, messageBuffer) =>
      this.onMQTTMessage(topic, messageBuffer)
    );
    this.readingsClient = new ReadingsClient();
    this.currentTaskID = 0;
    this.provider = ProviderManager.getHttpProvider(
      process.env.NETWORK,
      process.env.VGR_PK
    );
    this.machineAddress = this.provider.addresses[0];
    this.IO = require("../../utilities/socket.js").getIO();
  }

  onMQTTError(err) {
    Logger.error(err);
    this.mqttClient.end();
  }

  onMQTTClose() {
    Logger.logEvent(this.clientName, "MQTT client disconnected");
  }

  onMQTTConnect() {
    Logger.logEvent(this.clientName, "MQTT client connected");
    this.mqttClient.subscribe(Topics.TOPIC_VGR_ACK, { qos: 0 });
    if (process.env.MACHINE_CLIENTS_STATE) {
      this.mqttClient.subscribe(Topics.TOPIC_VGR_STATE, { qos: 0 });
    }
    ClientUtils.registerCallbackForEvent(
      this.clientName,
      "VGR",
      "TaskAssigned",
      (taskAssignedEvent) => this.onNewTaskAssigned(taskAssignedEvent)
    );
    ClientUtils.registerCallbackForEvent(
      this.clientName,
      "VGR",
      "NewReading",
      (newReadingEvent) => this.onNewReadingRequest(newReadingEvent)
    );
    ClientUtils.registerCallbackForEvent(
      this.clientName,
      "VGR",
      "ProductOperationSaved",
      (productOperationSavedEvent) =>
        this.onProductOperationSaved(productOperationSavedEvent)
    );
    ClientUtils.registerCallbackForEvent(
      this.clientName,
      "VGR",
      "NewAlert",
      (newAlertEvent) => this.onNewAlert(newAlertEvent)
    );
    ContractManager.getTruffleContract(this.provider, "VGR").then(
      (Contract) => {
        this.Contract = Contract;
      }
    );
  }

  onMQTTMessage(topic, messageBuffer) {
    var incomingMessage = JSON.parse(messageBuffer.toString());

    if (topic == Topics.TOPIC_VGR_ACK) {
      Logger.logEvent(
        this.clientName,
        "Received Ack message from VGR",
        incomingMessage
      );

      this.onNewAckReceived(incomingMessage);

      this.currentTaskID = 0;
    }
  }

  async onNewAckReceived(ackMessage) {
    var { taskID, productDID, processID, code } = ClientUtils.getAckMessageInfo(
      ackMessage
    );

    if (code == 8 || code == 9 || code == 10) {
      var note = "";

      if (code == 8) {
        note = "Unknown color";
      }

      if (code == 9) {
        note = "No product";
      }

      if (code == 10) {
        note = "NFC identification failed";
      }

      ClientUtils.sendFinishTaskTransaction(
        this.clientName,
        this.Contract,
        this.machineAddress,
        taskID,
        3,
        note
      );
      return;
    }

    if (code == 1) {
      var workpiece = ackMessage["workpiece"];
      if (workpiece) {
        this.getInfoTaskFinished(taskID, workpiece["type"], workpiece["id"]);
      }
      return;
    }

    ClientUtils.sendFinishTaskTransaction(
      this.clientName,
      this.Contract,
      this.machineAddress,
      taskID,
      2
    );
  }

  async onNewTaskAssigned(taskAssignedEvent) {
    ClientUtils.getTaskWithStatus(
      this.clientName,
      this.Contract,
      taskAssignedEvent
    )
      .then((task) => {
        this.sendStartTaskTransaction(taskAssignedEvent);
      })
      .catch((error) => {
        Logger.logError(error, this.clientName);
      });
  }

  async sendStartTaskTransaction(taskAssignedEvent) {
    ClientUtils.sendTaskStartTransaction(
      this.clientName,
      this.Contract,
      this.machineAddress,
      taskAssignedEvent
    )
      .then((task) => {
        this.currentTaskID = task.taskID;
        if (task.taskName == VGRClient.TASK1) {
          this.handleGetInfoTask(task);
        }

        if (task.taskName == VGRClient.TASK2) {
          this.handleDropToHBWTask(task);
        }

        if (task.taskName == VGRClient.TASK3) {
          this.handleMoveHBW2MPOTask(task);
        }

        if (task.taskName == VGRClient.TASK4) {
          this.handlePickSortedTask(task);
        }
      })
      .catch((error) => {
        Logger.logError(error, this.clientName);
      });
  }

  async onNewReadingRequest(newReadingEvent) {
    var { readingTypeIndex, readingType } = ClientUtils.getReadingType(
      newReadingEvent
    );
    var readingValue = this.readingsClient.getRecentReading(readingType);
    this.Contract.saveReadingVGR(
      this.currentTaskID,
      readingTypeIndex,
      readingValue,
      {
        from: this.machineAddress,
        gas: process.env.DEFAULT_GAS,
      }
    )
      .then((receipt) => {
        Logger.logEvent(this.clientName, `New reading has been saved`, receipt);
      })
      .catch((error) => {
        Logger.logError(error, this.clientName);
      });
  }

  async handleGetInfoTask(task) {
    var taskMessage = ClientUtils.getTaskMessageObject(task, 2);
    this.sendTask(task.taskID, task.taskName, taskMessage);
  }

  async handleDropToHBWTask(task) {
    var taskMessage = ClientUtils.getTaskMessageObject(task, 3);
    this.sendTask(task.taskID, task.taskName, taskMessage);
  }

  async handleMoveHBW2MPOTask(task) {
    var taskMessage = ClientUtils.getTaskMessageObject(task, 4);
    this.sendTask(task.taskID, task.taskName, taskMessage);
  }

  async handlePickSortedTask(task) {
    ClientUtils.getTaskInputs(this.Contract, task.taskID, ["color"])
      .then((inputValues) => {
        var taskMessage = ClientUtils.getTaskMessageObject(task, 5);
        taskMessage["type"] = inputValues[0];
        this.sendTask(task.taskID, task.taskName, taskMessage);
      })
      .catch((error) => {
        Logger.logError(error, this.clientName);
      });
  }

  sendTask(taskID, taskName, taskMessage) {
    Logger.logEvent(
      this.clientName,
      `Sending task ${taskName} ${taskID} to VGR`,
      taskMessage
    );
    this.mqttClient.publish(Topics.TOPIC_VGR_DO, JSON.stringify(taskMessage));
  }

  getInfoTaskFinished(taskID, color, id) {
    this.Contract.getTask(taskID)
      .then((task) => {
        this.Contract.finishGetInfoTask(taskID, id, color, {
          from: this.machineAddress,
          gas: process.env.DEFAULT_GAS,
        })
          .then((receipt) => {
            Logger.logEvent(
              this.clientName,
              `Task ${task[1]} ${taskID} is finished`,
              receipt
            );
            this.currentTaskID = 0;
          })
          .catch((error) => {
            Logger.logError(error, this.clientName);
          });
      })
      .catch((error) => {
        Logger.logError(error, this.clientName);
      });
  }

  onProductOperationSaved(productOperationSavedEvent) {
    ClientUtils.createProductOperationCredentials(
      this.clientName,
      productOperationSavedEvent,
      process.env.VGR_ADDRESS,
      process.env.VGR_PK
    );
  }

  async onNewAlert(newAlertEvent) {
    Logger.logEvent(
      this.clientName,
      `New alert has been saved: ${newAlertEvent.returnValues["reason"]}`,
      null
    );
    this.mqttClient.publish(
      Topics.TOPIC_VGR_DO,
      JSON.stringify(ClientUtils.getSoundMessage(2))
    );
  }
}

module.exports = VGRClient;
