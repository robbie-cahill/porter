import React, { useState, useContext, useMemo } from "react";
import styled from "styled-components";

import { integrationList } from "shared/common";
import { Context } from "shared/Context";
import api from "shared/api";

import ProvisionerForm from "components/ProvisionerForm";
import CloudFormationForm from "components/CloudFormationForm";
import CredentialsForm from "components/CredentialsForm";
import Helper from "components/form-components/Helper";
import Modal from "./porter/Modal";
import Text from "./porter/Text";
import Spacer from "./porter/Spacer";
import Fieldset from "./porter/Fieldset";
import Checkbox from "./porter/Checkbox";
import Button from "./porter/Button";
import ExpandableSection from "./porter/ExpandableSection";
import Input from "./porter/Input";
import Link from "./porter/Link";
import AzureCredentialForm from "components/AzureCredentialForm";

type Props = {
  setCurrentStep: (step: string) => void;
  setShowCostConfirmModal: (show: boolean) => void;
  markCostConsentComplete: () => void;
};

const AzureCostConsent: React.FC<Props> = ({
  setCurrentStep,
  setShowCostConfirmModal,
  markCostConsentComplete,
}) => {
  const [confirmCost, setConfirmCost] = useState("");

  return (
    <>
      <Modal
        closeModal={() => {
          setConfirmCost("");
          setShowCostConfirmModal(false);
        }}
      >
        <Text size={16}>Base Azure cost consent</Text>
        <Spacer height="15px" />
        <Text color="helper">
          Porter will create the underlying infrastructure in your own Azure
          account. You will be separately charged by Azure for this
          infrastructure. The cost for this base infrastructure is as follows:
        </Text>
        <Spacer y={1} />
        <ExpandableSection
          noWrapper
          expandText="[+] Show details"
          collapseText="[-] Hide details"
          Header={<Cost>$210.24 / mo</Cost>}
          ExpandedSection={
            <>
              <Spacer height="15px" />
              <Fieldset background="#1b1d2688">
                • Azure Kubernetes Service (AKS) = $73/mo
                <Spacer height="15px" />
                • Azure virtual machines:
                <Spacer height="15px" />
                <Tab />+ System workloads: Standard_B2als_v2 instance (3) =
                $82.34/mo
                <Spacer height="15px" />
                <Tab />+ Monitoring workloads: Standard_B2als_v2 instance (1) =
                $27.45/mo
                <Spacer height="15px" />
                <Tab />+ Application workloads: Standard_B2als_v2 instance (1) =
                $27.45/mo
              </Fieldset>
            </>
          }
        />
        <Spacer y={1} />
        <Text color="helper">
          The base Azure infrastructure covers up to 2 vCPU and 4GB of RAM for application workloads.
          Separate from the Azure cost, Porter charges based on your resource
          usage.
        </Text>
        <Spacer inline width="5px" />
        <Spacer y={0.5} />
        <Link hasunderline to="https://porter.run/pricing" target="_blank">
          Learn more about our pricing.
        </Link>
        <Spacer y={0.5} />
        <Text color="helper">
          You can use your Azure credits to pay for the underlying
          infrastructure, and if you are a startup with less than 5M in funding,
          you may qualify for our startup program that gives you $10k in
          credits.
        </Text>
        <Spacer y={0.5} />
        <Link
          hasunderline
          to="https://gcpjnf9adme.typeform.com/to/vUg9SDWf"
          target="_blank"
        >
          You can apply here.
        </Link>
        <Spacer y={0.5} />
        <Text color="helper">
          All Azure resources will be automatically deleted when you delete your
          Porter project. Please enter the Azure base cost ("210.24") below to
          proceed:
        </Text>
        <Spacer y={1} />
        <Input
          placeholder="210.24"
          value={confirmCost}
          setValue={setConfirmCost}
          width="100%"
          height="40px"
        />
        <Spacer y={1} />
        <Button
          disabled={confirmCost !== "210.24"}
          onClick={() => {
            setShowCostConfirmModal(false);
            setConfirmCost("");
            markCostConsentComplete();
            setCurrentStep("credentials");
          }}
        >
          Continue
        </Button>
      </Modal>
    </>
  );
};

export default AzureCostConsent;

const Cost = styled.div`
  font-weight: 600;
  font-size: 20px;
`;

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;
