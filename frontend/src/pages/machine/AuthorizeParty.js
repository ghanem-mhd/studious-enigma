// @flow

import * as React from "react";

import {
  Grid,
  Card,
  Button,
  Form
} from "tabler-react";

import AddressInput from '../utilities/AddressInput';
import { store } from 'react-notifications-component';
import Misc from '../utilities/Misc';

class AuthorizeParty extends React.Component {

    partyAddressInputRef = React.createRef();

    constructor(props) {
        super(props)
        this.state = {
            party: "manufacturer",
            inputValidity:{
                partyAddress:false
            }
        }
        this.initialState = this.state;
    }

    resetInputs(){
        var partyAddressInput    = this.partyAddressInputRef.current;
        partyAddressInput.resetInput();
        this.setState(this.initialState);
    }

    onAuthorizeButtonClicked(e){
        var MachineContract      = this.props.contracts[this.props.machine];
        var partyAddressInput    = this.partyAddressInputRef.current;
        var partyAddress         = partyAddressInput.state.addressInputState.value;

        var methodName = null
        if (this.state.party.toString() === "manufacturer"){
            methodName = "authorizeManufacturer"
        }else{
            methodName = "authorizeMaintainer"
        }

        Misc.getCurrentAccount(this.props.web3, (error, account) => {
            if (error){
                Misc.showAccountNotConnectedNotification(store);
            } else {
                MachineContract.methods[methodName](partyAddress).send({
                    from:account,
                    gas: process.env.REACT_APP_DEFAULT_GAS,
                    gasPrice: process.env.REACT_APP_GAS_PRICE
                })
                .on('transactionHash', (hash) => {
                    Misc.showTransactionHashMessage(store, hash);
                    this.resetInputs();
                })
                .on('confirmation', (confirmationNumber, receipt) => {
                    console.log(receipt)
                    if (confirmationNumber === process.env.REACT_APP_CONFIRMATION_COUNT){
                        Misc.showTransactionConfirmed(store, receipt);
                    }
                }).on('error', (error) => {
                    console.log(error)
                    Misc.showErrorMessage(store, error.message);
                }).catch(error => {
                    console.log(error);
                })
            }
        });
    }

    onPartyAddressValidityChanged(valid){
        var inputValidity = {};
        inputValidity.partyAddress = valid;
        this.setState({inputValidity})
    }

    handleChange(e){
        this.setState({party:e.target.value})
    }

    render () {
        return (
            <Grid.Row>
                <Grid.Col>
                    <Card title="Authorize New Party" isCollapsible>
                        <Card.Body>
                            <Form.Group label="Party Type">
                                <Form.Select onChange={this.handleChange.bind(this)}>
                                    <option value="manufacturer">Manufacturer</option>
                                    <option value="maintainer">Maintainer</option>
                                </Form.Select>
                            </Form.Group>
                            <AddressInput
                                        label="Address"
                                        showDIDMethod={false}
                                        web3={this.props.web3}
                                        onAddressValidityChanged={this.onPartyAddressValidityChanged.bind(this)}
                                        ref={this.partyAddressInputRef}
                            />
                        </Card.Body>
                        <Card.Footer>
                            <div align="right">
                                <Button
                                    disabled={!this.state.inputValidity.partyAddress}
                                    onClick={this.onAuthorizeButtonClicked.bind(this)}
                                    color="primary">
                                        Authorize
                                </Button>
                            </div>
                        </Card.Footer>
                    </Card>
                </Grid.Col>
            </Grid.Row>
        )
    }
}

export default AuthorizeParty;