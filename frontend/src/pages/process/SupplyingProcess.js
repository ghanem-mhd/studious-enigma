// @flow

import * as React from "react";

import { Page } from "tabler-react";

import ProcessInfo from "./ProcessInfo";
import StartProcess from "./StartProcess";
import ProcessStepper from "./ProcessStepper";
import ConnectionContext from "../utilities/ConnectionContext";

function getSteps() {
  return [
    { taskName: "Get Info Task", machineName: "VGR" },
    { taskName: "Fetch Container Task", machineName: "HBW" },
    { taskName: "Drop to Container Task", machineName: "VGR" },
    { taskName: "Store Container Task", machineName: "HBW" },
  ];
}

function getContractDynamicInfo() {
  return [
    {
      methodName: "getProcessesCount",
      infoName: "Process Instance Count",
      postfix: "Instances",
    },
    { methodName: "getProcessOwner", infoName: "Process Owner Address" },
    { methodName: "VGRContract", infoName: "VGR Machine Contract Address" },
    { methodName: "HBWContract", infoName: "HBW Machine Contract Address" },
  ];
}

class SupplyingProcess extends React.Component {
  componentDidMount() {
    document.title = "Supplying Process";
  }

  render() {
    return (
      <ConnectionContext.Consumer>
        {(connectionContext) => {
          this.web3 = connectionContext.web3;
          this.contract = connectionContext.contracts["SupplyingProcess"];
          var staticInfo = [
            { infoName: "Contract Address", infoValue: this.contract._address },
            { infoName: "Number of Machines", infoValue: "2 Machines" },
            { infoName: "Number of Steps", infoValue: "2 Steps" },
          ];
          return (
            <Page.Content title="Supplying Process">
              <ProcessStepper steps={getSteps()} activeStep={-1} />
              <ProcessInfo
                dynamicInfo={getContractDynamicInfo()}
                staticInfo={staticInfo}
                contract={this.contract}
              />
              <StartProcess
                web3={this.web3}
                contract={this.contract}
                methodName="startSupplyingProcess"
              />
            </Page.Content>
          );
        }}
      </ConnectionContext.Consumer>
    );
  }
}

export default SupplyingProcess;