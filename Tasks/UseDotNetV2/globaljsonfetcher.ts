"use strict";
import * as fileSystem from "fs";
import * as tl from 'azure-pipelines-task-lib/task';
import * as JSON5 from 'json5';
import { DotNetCoreVersionFetcher } from "./versionfetcher";
import { VersionInfo } from "./models";


// Reference https://learn.microsoft.com/en-us/dotnet/core/tools/global-json for type options and matching
const RollForwardOptionKeys = ["patch", "feature", "minor", "major", "latestPatch", "latestFeature", "latestMinor", "latestMajor", "disable"] as const;

type RollForwardOption = typeof RollForwardOptionKeys[number];

function isRollForwardOption(value: string): value is RollForwardOption {
    return RollForwardOptionKeys.includes(value as RollForwardOption);
}

type GlobalJsonConfig = { 
    sdk: { 
        version: string
        allowPrerelease?: boolean
        rollForward?: RollForwardOption | string
    } 
}

export class globalJsonFetcher {

    private workingDirectory: string;
    private versionFetcher: DotNetCoreVersionFetcher = new DotNetCoreVersionFetcher(true);
    /**
     * The global json fetcher provider functionality to extract the version information from all global json in the working directory.
     * @param workingDirectory
     */
    constructor(workingDirectory: string) {
        this.workingDirectory = workingDirectory;
    }

    /**
     * Get all version information from all global.json starting from the working directory without duplicates.
     */
    public async GetVersions(): Promise<VersionInfo[]> {
        var versionInformation: VersionInfo[] = new Array<VersionInfo>();
        var versionStrings = this.getVersionStrings();
        for (let index = 0; index < versionStrings.length; index++) {
            const version = versionStrings[index];
            if (version != null) {
                var versionInfo = await this.versionFetcher.getVersionInfo(version, null, "sdk", false);
                versionInformation.push(versionInfo);
            }
        }

        return Array.from(new Set(versionInformation)); // this remove all not unique values.
    }

    private getVersionStrings(): Array<string | null> {
        let filePathsToGlobalJson = tl.findMatch(this.workingDirectory, "**/global.json");
        if (filePathsToGlobalJson == null || filePathsToGlobalJson.length == 0) {
            throw tl.loc("FailedToFindGlobalJson", this.workingDirectory);
        }

        return filePathsToGlobalJson.map(path => {
            var content = this.readGlobalJson(path);
            if (content != null) {
                tl.loc("GlobalJsonSdkVersion", content.sdk.version, path);
                return content.sdk.version;
            }

            return null;
        })
            .filter(d => d != null); // remove all global.json that can't read
    }

    private readGlobalJson(path: string): GlobalJson | null {
        let globalJson: GlobalJsonConfig | undefined;
        tl.loc("GlobalJsonFound", path);
        try {
            let fileContent = fileSystem.readFileSync(path);
            // Since here is a buffer, we need to check length property to determine if it is empty. 
            if (!fileContent.length) {
            // do not throw if globa.json is empty, task need not install any version in such case.
                tl.loc("GlobalJsonIsEmpty", path);
                return null;
            }

            globalJson = (JSON5.parse(fileContent.toString())) as GlobalJsonConfig;
        } catch (error) {
            // we throw if the global.json is invalid
            throw tl.loc("FailedToReadGlobalJson", path, error); // We don't throw if a global.json is invalid. // ( ಠ ಠ )
        }

        if (!globalJson || !globalJson.sdk || !globalJson.sdk.version) { //todo officially global.json allows also for sdk.version to be missing in certain cases (e.g. fallback to latestMajor/ rollForward specified)
            tl.loc("FailedToReadGlobalJson", path);
            return null;
        }

        if(globalJson.sdk.rollForward && !isRollForwardOption(globalJson.sdk.rollForward)){
            tl.loc("GlobalJsonUnknownRollForwardOption", globalJson.sdk.rollForward, path);
            return null;
        }

        //TODO check if availbale config matches to allowed options

        return globalJson;
    }

}

export class GlobalJson {
    constructor(version: string | null = null) {
        if (version != null) {
            this.sdk = new sdk();
            this.sdk.version = version;
        }
    }
    public sdk: sdk;
}

class sdk {
    public version: string;
}