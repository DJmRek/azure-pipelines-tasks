import tl = require('azure-pipelines-task-lib/task');
var deployUtility = require('azure-pipelines-tasks-webdeployment-common/utility');
var zipUtility = require('azure-pipelines-tasks-webdeployment-common/ziputility');
import { applyTransformations } from 'azure-pipelines-tasks-webdeployment-common/fileTransformationsUtility';
import * as ParameterParser from 'azure-pipelines-tasks-webdeployment-common/ParameterParserUtility'
import { PackageType } from 'azure-pipelines-tasks-webdeployment-common/packageUtility';
import { DeploymentType } from '../taskparameters';
import { AzureRmWebAppDeploymentProvider } from './AzureRmWebAppDeploymentProvider';

const removeRunFromZipAppSetting: string = '-WEBSITE_RUN_FROM_ZIP -WEBSITE_RUN_FROM_PACKAGE';

export class WindowsWebAppZipDeployProvider extends AzureRmWebAppDeploymentProvider {

    private zipDeploymentID: string;

    public async DeployWebAppStep() {
        let deploymentMethodtelemetry = '{"deploymentMethod":"Zip Deploy for Windows"}';
        console.log("##vso[telemetry.publish area=TaskDeploymentMethod;feature=AzureFunctionAppDeployment]" + deploymentMethodtelemetry);

        var webPackage = await applyTransformations(this.taskParams.Package.getPath(), this.taskParams.WebConfigParameters, this.taskParams.Package.getPackageType());

        if(this.taskParams.DeploymentType === DeploymentType.zipDeploy) {
            var _isMSBuildPackage = await this.taskParams.Package.isMSBuildPackage();
            if(_isMSBuildPackage) {
                throw Error(tl.loc("Publishusingzipdeploynotsupportedformsbuildpackage"));
            }
            else if(this.taskParams.Package.getPackageType() === PackageType.war) {
                throw Error(tl.loc("Publishusingzipdeploydoesnotsupportwarfile"));
            }
        }

        if(tl.stats(webPackage).isDirectory()) {
            let tempPackagePath = deployUtility.generateTemporaryFolderOrZipPath(tl.getVariable('AGENT.TEMPDIRECTORY'), false);
            webPackage = await zipUtility.archiveFolder(webPackage, "", tempPackagePath);
            tl.debug("Compressed folder into zip " +  webPackage);
        }

        tl.debug("Initiated deployment via kudu service for webapp package : ");

        var deleteApplicationSetting = ParameterParser.parse(removeRunFromZipAppSetting)
        var isNewValueUpdated: boolean = await this.appServiceUtilityExt.updateAndMonitorAppSettings(null, deleteApplicationSetting);
        // add Output for isNewValueUpdated  
        tl.debug(" Ouutput the value for App Settings isNewValueUpdated : " + isNewValueUpdated);

        if(!isNewValueUpdated) {
            await this.kuduServiceUtility.warmpUp();
        }

        await this.kuduServiceUtility.getZipDeployValidation(webPackage);
        this.zipDeploymentID = await this.kuduServiceUtility.deployUsingZipDeploy(webPackage);

        await this.PostDeploymentStep();
    }

    public async UpdateDeploymentStatus(isDeploymentSuccess: boolean) {
        if(this.kuduServiceUtility) {
            await super.UpdateDeploymentStatus(isDeploymentSuccess);
            if(this.zipDeploymentID && this.activeDeploymentID && isDeploymentSuccess) {
                await this.kuduServiceUtility.postZipDeployOperation(this.zipDeploymentID, this.activeDeploymentID);
            }
        }
    }
}