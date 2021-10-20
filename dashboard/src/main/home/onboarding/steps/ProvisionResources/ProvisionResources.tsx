import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React from "react";
import { useParams } from "react-router";
import styled from "styled-components";
import ProviderSelector from "../../components/ProviderSelector";

import FormFlowWrapper from "./forms/FormFlow";
import ConnectExternalCluster from "./forms/_ConnectExternalCluster";
import { SupportedProviders } from "../../types";
import backArrow from "assets/back_arrow.png";
import { SharedStatus } from "./forms/SharedStatus";

type Props = {
  provider: SupportedProviders | "external";
  enable_go_back: boolean;
  project: {
    id: number;
    name: string;
  };
  shouldProvisionRegistry: boolean;
  onSelectProvider: (provider: SupportedProviders | "external") => void;
  onSaveCredentials: (credentials: any) => void;
  onSaveSettings: (settings: any) => void;
  onSuccess: () => void;
  onSkip: () => void;
  goBack: () => void;
};

const ProvisionResources: React.FC<Props> = ({
  provider,
  project,
  shouldProvisionRegistry,
  onSelectProvider,
  onSaveCredentials,
  onSaveSettings,
  onSuccess,

  enable_go_back,
  goBack,
}) => {
  const { step } = useParams<{ step: any }>();

  const Content = () => {
    switch (step) {
      case "credentials":
      case "settings":
        return (
          <>
            <FormFlowWrapper
              provider={provider}
              currentStep={step}
              onSaveCredentials={onSaveCredentials}
              onSaveSettings={onSaveSettings}
              project={project}
            />
          </>
        );
      case "status":
        return (
          <>
            <SharedStatus
              project={project}
              filter={[]}
              nextFormStep={console.log}
            />
          </>
        );
      case "connect_own_cluster":
        return (
          <>
            <ConnectExternalCluster nextStep={onSuccess} project={project} />
          </>
        );
      default:
        return (
          <>
            <ProviderSelector
              selectProvider={(provider) => {
                onSelectProvider(provider);
              }}
              enableSkip={false}
              enableExternal={!shouldProvisionRegistry}
            />
          </>
        );
    }
  };

  return (
    <div>
      {enable_go_back && (
        <BackButton
          onClick={() => {
            goBack();
          }}
        >
          <BackButtonImg src={backArrow} />
        </BackButton>
      )}
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>Step 3 of 3 - Provision resources</Subtitle>
      <Helper>
        Porter automatically creates a cluster and registry in your cloud to run
        applications.
      </Helper>
      {Content()}
    </div>
  );
};

export default ProvisionResources;

const Subtitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  margin-top: 16px;
`;

const NextStep = styled(SaveButton)`
  margin-top: 24px;
`;

const BackButton = styled.div`
  margin-bottom: 24px;
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;
