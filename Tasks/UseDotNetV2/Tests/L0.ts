"use strict";
const assert = require('assert');
const ttm = require('azure-pipelines-task-lib/mock-test');
const os = require('os');
const path = require('path');

function setResponseFile(name) {
    process.env['MOCK_RESPONSES'] = path.join(__dirname, name);
}

function runValidations(validator: () => void, tr) {
    try {
        validator();
    }
    catch (error) {
        console.log("STDERR", tr.stderr);
        console.log("STDOUT", tr.stdout);
    }
}

describe('UseDotNet', function () {
    this.timeout(30000);
    before(async () => {

    });

    after(async () => {
    });

    it("[VersionUtilities] versionCompareFunction should throw for non explicit versions or empty version strings", async () => {
        process.env["__non_explicit__"] = "true"
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionUtilityVersionCompareTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("should have thrown and failed"));
            assert(tr.stdout.indexOf("FunctionThrewAsExpected") > -1, "Should have thrown as versions are not explicit and are empty strings.");
        }, tr);
    });

    it("[VersionUtilities] versionCompareFunction should return 1, 0 or -1 when versionA is gt, eq or lt versionB", async () => {
        process.env["__non_explicit__"] = "false";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionUtilityVersionCompareTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have succeeded"));
            assert(tr.stdout.indexOf("FunctionGaveRightResult") > -1, "Should have given right results for all cases.");
        }, tr);
    });

    it("[VersionUtilities] compareChannelVersion function should throw when either or both channel versions are empty or are non numeric", async () => {
        process.env["__non_explicit__"] = "true"
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionUtilityVersionCompareTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("should have thrown and failed"));
            assert(tr.stdout.indexOf("FunctionThrewAsExpected") > -1, "Should have thrown as versions are not explicit and are empty strings.");
        }, tr);
    });

    it("[VersionUtilities] compareChannelVersion function should return 1, 0 or -1 when channelVersionA is gt, eq or lt channelVersionB", async () => {
        process.env["__non_explicit__"] = "false";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionUtilityChannelVersionCompareTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have succeeded"));
            assert(tr.stdout.indexOf("FunctionGaveRightResult") > -1, "Should have given right results for all cases.");
        }, tr);
    });

    it("[VersionUtilities] getMatchingVersionFromList should return null for empty versionInfoList, versionInfoList elements having empty version or no matching version found in list while toggling includePreviewVersionsValue", async () => {
        process.env["__empty__"] = "true"
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionUtilityGetMatchingVersionFromListTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have succeeded"));
            assert(tr.stdout.indexOf("FunctionReturnedNull") > -1, "Should have returned null for all cases and print the message.");
        }, tr);
    });

    it("[VersionUtilities] getMatchingVersionFromList should return heighest version for the spec when versionSpec is not exact version", async () => {
        process.env["__empty__"] = "false"
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionUtilityGetMatchingVersionFromListTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have succeeded"));
            assert(tr.stdout.indexOf("FuctionReturnedCorrectVersion") > -1, "Should have returned null for all cases and print the message.");
        }, tr);
    });

    it("[Models.VersionParts] constructor should throw when version fails validation", async () => {
        process.env["__invalid_versionparts__"] = "true";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "modelsVersionPartsTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed"));
            assert(tr.stdout.indexOf("FunctionThrewAsExpected") > -1, "Should have thrown for all invalid version specs.");
        }, tr);
    });

    it("[Models.VersionParts] constructor return object instance with correct major, minor and patch version", async () => {
        process.env["__invalid_versionparts__"] = "false";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "modelsVersionPartsTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned right objects"));
            assert(tr.stdout.indexOf("VersionPartsCreatedSuccessfully") > -1, "Should have returned the correct objects and print the statement.");
        }, tr);
    });

    it("[Models.Channel] constructor should throw if object passed doesn't contain channel-version or releasesJsonUrl, or contains invalid releasesJsonUrl", async () => {
        process.env["__invalid_channelobject__"] = "true";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "modelsChannelTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed for incorrect objects."));
            assert(tr.stdout.indexOf("FunctionThrewAsExpected") > -1, "Should have thrown error in all cases.");
        }, tr);
    });

    it("[Models.Channel] constructor should pass if object contains channel-version and valid releasesJsonUrl", async () => {
        process.env["__invalid_channelobject__"] = "false";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "modelsChannelTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have successfully created channel objects."));
            assert(tr.stdout.indexOf("ChannelCreatedSuccessfully") > -1, "Should have returned the correct objects and print the statement.");
        }, tr);
    });

    it("[Models.VersionInfo] getRuntimeVersion should return correct runtime-version from sdk versionInfo object", async () => {
        process.env["__sdk_runtime__"] = "true";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "modelsGetRuntimeVersionTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have successfully returned runtime versions for sdk package type."));
            assert(tr.stdout.indexOf("RuntimeVersionsReturnedForSdkAreCorrect") > -1, "Should have returned correct runtime versions for all cases of packageType sdk.");
        }, tr);
    });

    it("[Models.VersionInfo] getRuntimeVersion should return version for runtime versionInfo object", async () => {
        process.env["__sdk_runtime__"] = "false";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "modelsGetRuntimeVersionTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have successfully returned runtime versions for runtime package type."));
            assert(tr.stdout.indexOf("RuntimeVersionsReturnedAreCorrect") > -1, "Should have returned correct runtime versions for all cases of packageType runtime.");
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should throw if version for pacakge type can not be found, and error message should contain the package type", async () => {
        process.env["__failat__"] = "versionnotfound";
        process.env["__versionspec__"] = "2.2.999-cantbefound-234";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoFailTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as the wanted version of package type can not be found."));
            assert(tr.stdout.indexOf("VersionNotFound") > -1, "Should have thrown version not found exception.");
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should throw if getting channel fails", async () => {
        process.env["__failat__"] = "channelfetch";
        process.env["__versionspec__"] = "2.2.999-cantbefound-234";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoFailTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as channels could not be fetched."));
            assert(tr.stdout.indexOf("ExceptionWhileDownloadOrReadReleasesIndex") > -1, "Should have thrown exception and returned.");
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should throw if preview versions included and version not found", async () => {
        process.env["__failat__"] = "versionnotfound";
        process.env["__versionspec__"] = "4.40.x";
        process.env["__inlcudepreviewversion__"] = "true";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoFailTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as channels could not be fetched."));
            assert(tr.stdout.indexOf("MatchingVersionNotFound") > -1, "Should not have found a matching version.");
            assert(tr.stdout.indexOf("VersionNotFound") > -1, "Should have thrown with VersionNotFound error.");
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should return correct version info for a correct version spec", async () => {
        process.env["__versionspec__"] = "2.2.103";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoTestsCorrect.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned the correct version info."));
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should be able to return versionInfo for sdk present in sdks property of a release object.", async () => {
        process.env["__versionspec__"] = "2.2.104";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoTestsCorrect.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned the correct version info."));
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should return correct version info for a version which exists in a different channel of the same major version", async () => {
        process.env["__versionspec__"] = "2.1.104";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoTestsCorrect.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned the correct version info."));
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should return latest version info in a major version for a versionSpec of type majorVersion.x", async () => {
        process.env["__versionspec__"] = "2.x";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoTestsCorrect.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned the correct version info."));
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should return latest version info in a major.minor version for a versionSpec of type majorVersion.minorVersion.x", async () => {
        process.env["__versionspec__"] = "2.2.x";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoTestsCorrect.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned the correct version info."));
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should return latest preview version info if includePreviewVersion is true and latest version is a preview version", async () => {
        process.env["__versionspec__"] = "2.2.x";
        process.env["__inlcudepreviewversion__"] = "true";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoTestsCorrect.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned the correct version info."));
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should return latest version info even if includePreviewVersion is true but latest version is non preview", async () => {
        process.env["__versionspec__"] = "2.3.x";
        process.env["__inlcudepreviewversion__"] = "true";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoTestsCorrect.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned the correct version info."));
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should return latest version info if includePreviewVersion is true and only 1 channel and is preview", async () => {
        process.env["__versionspec__"] = "3.x";
        process.env["__inlcudepreviewversion__"] = "true";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoTestsCorrect.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned the correct version info."));
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getVersionInfo should return latest version info if includePreviewVersion is false and latest version is preview", async () => {
        process.env["__versionspec__"] = "4.x";
        process.env["__inlcudepreviewversion__"] = "false";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetVersionInfoTestsCorrect.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned the correct version info."));
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getDownloadUrl should throw if VersionFilesData doesn't contain download URL", async () => {
        process.env["__ostype__"] = "win";
        process.env["__getmachineosfail__"] = "false";
        process.env["__versioninfo__"] = `{"version":"2.2.104", "files": [{"name":"winpackage.zip", "rid":"win-x64", "url": ""}]}`;
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetDownloadUrlFailTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as download URL is missing."));
            assert(tr.stdout.indexOf("DownloadUrlForMatchingOsNotFound") > 0, ("Should have thrown the error message as download URL is not present."))
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getDownloadUrl should throw if download information object with RID matching OS, could not be found", async () => {
        process.env["__ostype__"] = "win";
        process.env["__getmachineosfail__"] = "false";
        process.env["__versioninfo__"] = `{"version":"2.2.104", "files": [{"name": "linux.tar.gz", "rid":"linux-x64", "url": ""}, {"name": "win.zip", "rid":"win-x86", "url": ""}]}`;
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetDownloadUrlFailTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as download URL is missing."));
            assert(tr.stdout.indexOf("DownloadUrlForMatchingOsNotFound") > 0, ("Should have thrown the error message as download URL is not present."))
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getDownloadUrl should throw if error encountered while detecting machine os", async () => {
        process.env["__ostype__"] = "win";
        process.env["__getmachineosfail__"] = "true";
        process.env["__versioninfo__"] = `{"version":"2.2.104", "files": [{"name": "linux.tar.gz", "rid":"linux-x64", "url": ""}, {"name":"winpackage.zip", "rid":"win-x86", "url": ""}]}`;
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetDownloadUrlFailTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as machine os could not be detected."));
            assert(tr.stdout.indexOf("getMachinePlatformFailed") > 0, ("Should have thrown the error message as getMachineOs script execution was not successful."))
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getDownloadUrl should throw if zip package is not found for windows os", async () => {
        process.env["__ostype__"] = "win";
        process.env["__getmachineosfail__"] = "false";
        process.env["__versioninfo__"] = `{"version":"2.2.104", "files": [{"name": "winpacakage.exe", "rid":"win-x64", "url": "https://path.to/file.exe"}, {"name": "winpacakage2.exe", "rid":"win-x86", "url": "https://path.to/file.exe"}]}`;
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetDownloadUrlFailTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as download URL is missing."));
            assert(tr.stdout.indexOf("DownloadUrlForMatchingOsNotFound") > 0, ("Should have thrown the error message as download url of zip could not be found for windows."))
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getDownloadUrl should throw if tar.gz package is not found for non windows os", async () => {
        process.env["__ostype__"] = "osx";
        process.env["__getmachineosfail__"] = "false";
        process.env["__versioninfo__"] = `{"version":"2.2.104", "files": [{"name": "linux.tar", "rid":"linux-x64", "url": "https://path.to/file.pkg"}, {"name": "osx.pkg", "rid":"osx-x64", "url": "https://path.to/file.pkg"}]}`;
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetDownloadUrlFailTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as download URL is missing."));
            assert(tr.stdout.indexOf("DownloadUrlForMatchingOsNotFound") > 0, ("Should have thrown the error message as download url of tar file could not be found for mac os."))
        }, tr);
    });

    it("[VersionFetcher.DotNetCoreVersionFetcher] getDownloadUrl should return correct download URL for matching OS", async () => {
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionFetcherGetDownloadUrlPassTests.js"));
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have passed as download URL for all windows, linux and osx are available for correct rid."));
            assert(tr.stdout.indexOf("CorrectDownloadUrlsSuccessfullyReturnedForAllOs") > 0, ("Should have printed success message on receiving correct urls for all os's."))
        }, tr);
    });

    it("[VersionInstaller] constructor should throw if installationPath doesn't exist and cannot be created", async () => {
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionInstallerTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as the installation path doesn't exist and cannot be created or the process doesn't have permission over it."))
        }, tr);
    });

    it("[VersionInstaller] downloadAndInstall should throw if passed arguments are empty or doesn't contain version or downloadUrl is malformed", async () => {
        process.env["__case__"] = "urlerror";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionInstallerDownloadAndInstallTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as the arguments passed are not correct."));
            assert(tr.stdout.indexOf("VersionCanNotBeDownloadedFromUrl") > -1, "Should have thrown this error: VersionCanNotBeDownloadedFromUrl");
            assert(tr.stdout.lastIndexOf("VersionCanNotBeDownloadedFromUrl") > tr.stdout.indexOf("VersionCanNotBeDownloadedFromUrl"), "Should have thrown this error: VersionCanNotBeDownloadedFromUrl");
        }, tr);
    });

    it("[VersionInstaller] downloadAndInstall should throw if downloading version from URL fails", async () => {
        process.env["__case__"] = "downloaderror";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionInstallerDownloadAndInstallTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as downloading the package from url did not complete."));
            assert(tr.stdout.indexOf("CouldNotDownload") > -1, "Should have thrown this error: CouldNotDownload");
        }, tr);
    });

    it("[VersionInstaller] downloadAndInstall should throw if extracting downloaded package or copying folders into installation path fails.", async () => {
        process.env["__case__"] = "extracterror";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionInstallerDownloadAndInstallTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as extraction of package was not successfull."));
            assert(tr.stdout.indexOf("FailedWhileExtractingPacakge") > -1, "Should have thrown this error: FailedWhileExtractingPacakge");
        }, tr);
    });

    it("[VersionInstaller] downloadAndInstall should not throw if root folders were successfully copied but copying root files from package into installationPath failed", async () => {
        process.env["__case__"] = "filecopyerror";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionInstallerDownloadAndInstallTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have passed."));
            assert(tr.stdout.indexOf("FailedToCopyTopLevelFiles") > -1, "Should not have caused function failure when root file's copying failed.");
            assert(tr.stdout.indexOf("SuccessfullyInstalled") > -1, "Function should have completed successfully.");
        }, tr);
    });

    it("[VersionInstaller] downloadAndInstall should not copy files from root folder if version being installed in the path is not greater than all other already present or runtime is being installed", async () => {
        process.env["__case__"] = "conditionalfilecopy";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionInstallerDownloadAndInstallTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have passed."));
            assert(tr.stdout.lastIndexOf("CopyingFilesIntoPath [ 'installationPath' ]") == tr.stdout.indexOf("CopyingFilesIntoPath [ 'installationPath' ]"), "Should have copied root files in only one case where the version being installed is latest among already installed ones.");
        }, tr);
    });

    it("[VersionInstaller] downloadAndInstall should throw if creating version.complete file fails.", async () => {
        process.env["__case__"] = "versioncompletefileerror";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionInstallerDownloadAndInstallTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed as creating completion markup file failed for package."));
            assert(tr.stdout.indexOf("CreatingInstallationCompeleteFile") > -1, "Should have tried creating the file.");
            assert(tr.stdout.indexOf("FailedWhileInstallingVersionAtPath") > -1, "Should have thrown this error as the parent error.");
        }, tr);
    });

    it("[VersionInstaller] downloadAndInstall should complete successfully on complete installation and create complete file in both sdk and runtime when sdk is installed and in runtime when only runtime is installed.", async () => {
        process.env["__case__"] = "successfullinstall";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionInstallerDownloadAndInstallTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have passed."));
            assert(tr.stdout.indexOf("SuccessfullyInstalled") > -1, "Should have SuccessfullyInstalled.")
        }, tr);
    });

    it("[VersionInstaller] isVersionInstalled should throw if version being checked is not explicit.", async () => {
        process.env["__case__"] = "nonexplicit";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionInstallerIsVersionInstalledTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed."));
            assert(tr.stdout.indexOf("ExplicitVersionRequired") > -1, "Should have printed ExplicitVersionRequired.")
        }, tr);
    });

    it("[VersionInstaller] isVersionInstalled should return false if either folder or file with name as version is not present inside sdk/runtime folder.", async () => {
        process.env["__case__"] = "folderorfilemissing";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionInstallerIsVersionInstalledTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned false without failure."));
            assert(tr.stdout.indexOf("VersionFoundInCache") <= -1, "Should not have found any version in cache as either file or folder for that version were missing");
        }, tr);
    });

    it("[VersionInstaller] isVersionInstalled should return true if both folder or file with name as version is present inside sdk/runtime path.", async () => {
        process.env["__case__"] = "success";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "versionInstallerIsVersionInstalledTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have returned false without failure."));
            assert(tr.stdout.indexOf("VersionFoundInCache") > -1, "Should not have found any version in cache as either file or folder for that version were missing");
        }, tr);
    });

    it("[usedotnet] run should throw if versionSpec is invalid.", async () => {
        process.env["__case__"] = "matchingversionnotfound";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "usedotnetTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == false, ("Should have failed."));
            assert(tr.stdout.indexOf("MatchingVersionNotFound") > -1, "Should not have thrown this message as versionInfo for a matching version could not be found.");
        }, tr);
    });

    it("[usedotnet] run should skip installation if version found in cache but should prepend all the required paths and should also use $(Agent.ToolsDirectory)/dotnet as installation when input is missing.", async () => {
        process.env["__case__"] = "skipinstallation";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "usedotnetTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have passed."));
            assert(tr.stdout.indexOf("PrependingInstallationPath") > -1, "Should have prepended installation path");
            assert(tr.stdout.indexOf("PrependGlobalToolPath") > -1, "Should have printed this message as addDotNetCoreToolPath function should have been called.");
            assert(tr.stdout.indexOf("PrependingGlobalToolPath") > -1, "Should have prepended global tool path");
            assert(tr.stdout.indexOf("DownloadAndInstallCalled") == -1, "Should not have printed this message as DownloadAndInstall function should not have been called.");
        }, tr);
    });

    it("[usedotnet] run should install if version is not found in cache and prepend the required paths.", async () => {
        process.env["__case__"] = "installversion";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "usedotnetTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have passed."));
            assert(tr.stdout.indexOf("PrependingInstallationPath") > -1, "Should have prepended installation path");
            assert(tr.stdout.indexOf("PrependGlobalToolPath") > -1, "Should have printed this message as addDotNetCoreToolPath function should have been called.");
            assert(tr.stdout.indexOf("PrependingGlobalToolPath") > -1, "Should have prepended global tool path");
            assert(tr.stdout.indexOf("DownloadAndInstallCalled") > -1, "Should have printed this message as DownloadAndInstall function should have been called.");
        }, tr);
    });

    it("[usedotnet] run should not fail if globalToolPath could not be created or set.", async () => {
        process.env["__case__"] = "globaltoolpathfailure";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "usedotnetTests.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have passed."));
            assert(tr.stdout.indexOf("PrependingInstallationPath") > -1, "Should have prepended installation path");
            assert(tr.stdout.indexOf("PrependGlobalToolPath") > -1, "Should have printed this message as addDotNetCoreToolPath function should have been called.");
            assert(tr.stdout.indexOf("ErrorWhileSettingDotNetToolPath") > -1, "Should have printed this message as error must have been encountered while setting GlobalToolPath.");
        }, tr);
    });

    it("[globaljsonfetcher] run should not fail if one global.json with a valid version was found.", async () => {
        process.env["__case__"] = "subdirAsRoot";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "globaljsonfetcherTest.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have passed."));
            assert(tr.stdout.indexOf("GlobalJsonFound") > -1, "should found a global.json file");
        }, tr);
    });
    it("[globaljsonfetcher] run should not fail if two global.json with a valid version was found.", async () => {
        process.env["__case__"] = "rootAsRoot";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "globaljsonfetcherTest.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have passed."));
            assert(tr.stdout.indexOf("GlobalJsonFound") > -1, "should found a global.json file");
        }, tr);
    });
    it("[globaljsonfetcher] run should fail if no global.json is found.", async () => {
        process.env["__case__"] = "invalidDir";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "globaljsonfetcherTest.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should't have passed."));
            assert(tr.stdout.indexOf("FailedToFindGlobalJson") > -1, "should throw an error that no file was found.");
        }, tr);
    });
    it("[globaljsonfetcher] run shouldn't fail if the global.json is empty.", async () => {
        process.env["__case__"] = "emptyGlobalJson";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "globaljsonfetcherTest.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should passed."));
            assert(tr.stdout.indexOf("GlobalJsonIsEmpty") > -1, "should throw an error that no file was found.");
        }, tr);
    });
    it("[globaljsonfetcher] run shouldn't fail if the global.json has comments.", async () => {
        process.env["__case__"] = "globalJsonWithComments";
        let tr = new ttm.MockTestRunner(path.join(__dirname, "globaljsonfetcherTest.js"))
        await tr.runAsync();
        runValidations(() => {
            assert(tr.succeeded == true, ("Should have passed."));
            assert(tr.stdout.indexOf("GlobalJsonFound") > -1, "should found a global.json file");
        }, tr);
    });
});