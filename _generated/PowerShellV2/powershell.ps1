[CmdletBinding()]
param()

Import-Module $PSScriptRoot\ps_modules\VstsTaskSdk
Import-Module $PSScriptRoot\ps_modules\Sanitizer
Import-Module Microsoft.PowerShell.Security

. $PSScriptRoot\helpers.ps1
$env:praval = ""
$env:startTask = ""

function Get-ActionPreference {
    param (
        [Parameter(Mandatory)]
        [string]
        $VstsInputName,

        [Parameter()]
        [string]
        $DefaultAction = 'Default',

        [Parameter()]
        [string[]]
        $ValidActions = @( 'Default', 'Stop', 'Continue', 'SilentlyContinue' )
    )

    $result = Get-VstsInput -Name $VstsInputName -Default $DefaultAction

    if (-not $ValidActions -contains $result) {
        Write-Error (Get-VstsLocString -Key 'PS_InvalidActionPreference' -ArgumentList @( $VstsInputName, $result, ($ValidActions -join ', ') ))
    }

    return $result
}

function Get-EnvironmentAuthUrl {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)] $endpoint,
        [Parameter(Mandatory = $false)] $useMSAL = $false
    )

    $defaultEnvironmentMSALAuthUri = "https://login.microsoftonline.com/"
    $defaultEnvironmentADALAuthUri = "https://login.windows.net/"
    $azureStack = "AzureStack"

    $envAuthUrl = if ($useMSAL) { $endpoint.Data.activeDirectoryAuthority } else { $endpoint.Data.environmentAuthorityUrl }

    if ([string]::IsNullOrEmpty($envAuthUrl)) {
        if (($endpoint.Data.Environment) -and ($endpoint.Data.Environment -eq $azureStack)) {
            Write-Verbose "MSAL - Get-EnvironmentAuthUrl - azureStack is used"
            $endpoint = Add-AzureStackDependencyData -Endpoint $endpoint
            $envAuthUrl = $endpoint.Data.environmentAuthorityUrl
        }
        else {
            Write-Verbose "MSAL - Get-EnvironmentAuthUrl - fallback is used"
            # fallback
            $envAuthUrl = if ($useMSAL) { $defaultEnvironmentMSALAuthUri } else { $defaultEnvironmentADALAuthUri }
        }
    }

    Write-Verbose "MSAL - Get-EnvironmentAuthUrl - endpoint=$endpoint"
    Write-Verbose "MSAL - Get-EnvironmentAuthUrl - useMSAL=$useMSAL"
    Write-Verbose "MSAL - Get-EnvironmentAuthUrl - envAuthUrl=$envAuthUrl"

    return $envAuthUrl
}

function Get-TaskDictionary {
    $dictionary = @{}

    $connectedServiceName = (Get-VstsInput -Name ConnectedServiceName)
    $dictionary["ConnectedServiceName"] = $connectedServiceName
    Write-Verbose "connectedServiceName : $connectedServiceName"

    $endpoint = Get-VstsEndpoint -Name $connectedServiceName -Require
    $dictionary["ClientId"] = $endpoint.Auth.Parameters.ServicePrincipalId
    $dictionary["TenantId"] = $endpoint.Auth.Parameters.TenantId
    $dictionary["EnvAuthUrl"] = Get-EnvironmentAuthUrl -endpoint $endpoint -useMSAL $true

    $vstsEndpoint = Get-VstsEndpoint -Name SystemVssConnection -Require
    $dictionary["VstsAccessToken"] = $vstsEndpoint.auth.parameters.AccessToken

    return $dictionary
}

function Get-EnvDictionary {
    $envVars = @{}
    [System.Environment]::GetEnvironmentVariables().GetEnumerator() | ForEach-Object {
        $envVars[$_.Key] = $_.Value
    }
    return $envVars
}

function RunTokenHandler {
    param (
        $pipeName
    )

    $runspacePool = [runspacefactory]::CreateRunspacePool(1, 1)
    $runspacePool.Open()

    $accessTokenHelperFilePath = "$PSScriptRoot\AccessTokenHelper.ps1"
    $taskDict = Get-TaskDictionary
    $envVars = Get-EnvDictionary

    $psRunspace = [powershell]::Create().AddScript({
        param($accessTokenHelperFilePath, $pipeName, $taskDict, $envVars)
        try {
            # Copying the env variables from parent runspace to the child runspace.
            $envVars.GetEnumerator() | ForEach-Object {
                [System.Environment]::SetEnvironmentVariable($_.Key, $_.Value, [System.EnvironmentVariableTarget]::Process)
            }

            . $accessTokenHelperFilePath
            $tokenHandler.Run.Invoke($pipeName, $taskDict)
            return 1
        } catch {
            $env:praval = $env:praval + " " + $_ 
            return $_
        }    
    }).AddArgument($accessTokenHelperFilePath).AddArgument($PipeName).AddArgument($taskDict).AddArgument($envVars)

    $psRunspace.RunspacePool = $runspacePool
    $psRunspace.BeginInvoke()
}

Trace-VstsEnteringInvocation $MyInvocation
try {
    Import-VstsLocStrings "$PSScriptRoot\task.json"
    $systemAccessToken = Get-VstsTaskVariable -Name 'System.AccessToken' -Require

    $pipeName = "PowerShellV2TaskNamedPipe-" + [System.Guid]::NewGuid().ToString()
    Write-Host "PipeName : $pipeName"

    $connectedServiceName = (Get-VstsInput -Name ConnectedServiceName)
    Write-Host $connectedServiceName

    if (![string]::IsNullOrWhiteSpace($connectedServiceName)) {
        RunTokenHandler -pipeName $pipeName
        Write-Host $env:praval

        while($env:startTask -ne "true") {
            Write-Host $env:praval
            Start-Sleep 10
        }
    }

    # Get inputs.
    $input_errorActionPreference = Get-ActionPreference -VstsInputName 'errorActionPreference' -DefaultAction 'Stop'
    $input_warningPreference = Get-ActionPreference -VstsInputName 'warningPreference' -DefaultAction 'Default'
    $input_informationPreference = Get-ActionPreference -VstsInputName 'informationPreference' -DefaultAction 'Default'
    $input_verbosePreference = Get-ActionPreference -VstsInputName 'verbosePreference' -DefaultAction 'Default'
    $input_debugPreference = Get-ActionPreference -VstsInputName 'debugPreference' -DefaultAction 'Default'
    $input_progressPreference = Get-ActionPreference -VstsInputName 'progressPreference' -DefaultAction 'SilentlyContinue'

    $input_showWarnings = Get-VstsInput -Name 'showWarnings' -AsBool
    $input_failOnStderr = Get-VstsInput -Name 'failOnStderr' -AsBool
    $input_ignoreLASTEXITCODE = Get-VstsInput -Name 'ignoreLASTEXITCODE' -AsBool
    $input_pwsh = Get-VstsInput -Name 'pwsh' -AsBool
    $input_workingDirectory = Get-VstsInput -Name 'workingDirectory' -Require
    Assert-VstsPath -LiteralPath $input_workingDirectory -PathType 'Container'
    $input_targetType = Get-VstsInput -Name 'targetType'
    if ("$input_targetType".ToUpperInvariant() -eq "FILEPATH") {
        $input_filePath = Get-VstsInput -Name 'filePath' -Require
        try {
            Assert-VstsPath -LiteralPath $input_filePath -PathType Leaf
        }
        catch {
            Write-Error (Get-VstsLocString -Key 'PS_InvalidFilePath' -ArgumentList $input_filePath)
        }

        if (!$input_filePath.ToUpperInvariant().EndsWith('.PS1')) {
            Write-Error (Get-VstsLocString -Key 'PS_InvalidFilePath' -ArgumentList $input_filePath)
        }

        $input_arguments = Get-VstsInput -Name 'arguments'
    }
    elseif ("$input_targetType".ToUpperInvariant() -eq "INLINE") {
        $input_script = Get-VstsInput -Name 'script'
    }
    else {
        Write-Error (Get-VstsLocString -Key 'PS_InvalidTargetType' -ArgumentList $input_targetType)
    }
    $input_runScriptInSeparateScope = Get-VstsInput -Name 'runScriptInSeparateScope' -AsBool

    # Generate the script contents.
    Write-Host (Get-VstsLocString -Key 'GeneratingScript')
    $contents = @()
    if ($input_errorActionPreference -ne 'Default') {
        $contents += "`$ErrorActionPreference = '$input_errorActionPreference'"
    }
    if ($input_warningPreference -ne 'Default') {
        $contents += "`$WarningPreference = '$input_warningPreference'"
    }
    if ($input_informationPreference -ne 'Default') {
        $contents += "`$InformationPreference = '$input_informationPreference'"
    }
    if ($input_verbosePreference -ne 'Default') {
        $contents += "`$VerbosePreference = '$input_verbosePreference'"
    }
    if ($input_debugPreference -ne 'Default') {
        $contents += "`$DebugPreference = '$input_debugPreference'"
    }
    if ($input_progressPreference -ne 'Default') {
        $contents += "`$ProgressPreference = '$input_progressPreference'"
    }
    # Change default error view to normal view. We need this for error handling since we pipe stdout and stderr to the same stream
    # and we rely on PowerShell piping back NormalView error records (required because PowerShell Core changed the default to ConciseView)
    $contents += "`$ErrorView = 'NormalView'"
    if ("$input_targetType".ToUpperInvariant() -eq 'FILEPATH') {

        try {
            $null = Protect-ScriptArguments -InputArgs $input_arguments -TaskName "PowerShellV2"
        }
        catch {
            $message = $_.Exception.Message

            if ($message -eq (Get-VstsLocString -Key 'ScriptArgsSanitized')) {
                throw $message;
            }

            $telemetry = @{
                'UnexpectedError' = $message
                'ErrorStackTrace' = $_.Exception.StackTrace
            }
            Publish-Telemetry $telemetry
        }

        $contents += ". '$("$input_filePath".Replace("'", "''"))' $input_arguments".Trim()
        Write-Host (Get-VstsLocString -Key 'PS_FormattedCommand' -ArgumentList ($contents[-1]))
    }
    else {
        $contents += "$input_script".Replace("`r`n", "`n").Replace("`n", "`r`n")
    }

    if (!$input_ignoreLASTEXITCODE) {
        $contents += 'if (!(Test-Path -LiteralPath variable:\LASTEXITCODE)) {'
        $contents += '    Write-Host ''##vso[task.debug]$LASTEXITCODE is not set.'''
        $contents += '} else {'
        $contents += '    Write-Host (''##vso[task.debug]$LASTEXITCODE: {0}'' -f $LASTEXITCODE)'
        $contents += '    exit $LASTEXITCODE'
        $contents += '}'
    }

    $joinedContents = [System.String]::Join(
        ([System.Environment]::NewLine),
        $contents);
    if ($input_showWarnings) {
        $joinedContents = '
            $warnings = New-Object System.Collections.ObjectModel.ObservableCollection[System.Management.Automation.WarningRecord];
            Register-ObjectEvent -InputObject $warnings -EventName CollectionChanged -Action {
                if($Event.SourceEventArgs.Action -like "Add"){
                    $Event.SourceEventArgs.NewItems | ForEach-Object {
                        Write-Host "##vso[task.logissue type=warning;]$_";
                    }
                }
            };
            Invoke-Command {' + $joinedContents + '} -WarningVariable +warnings';
    }

    if (![string]::IsNullOrWhiteSpace($connectedServiceName)) {
        $joinedContents = '

        try 
        {
            $AzDoTokenPipe = New-Object System.IO.Pipes.NamedPipeClientStream(".", "' + $pipeName  + '", [System.IO.Pipes.PipeDirection]::InOut)
            Write-Host "Trying connect to the server."
            $AzDoTokenPipe.Connect(60000)
            Write-Host "Connected to the server."
        
            function Get-AzDoToken {
                Write-Host "Received Token Request"
                $writer = New-Object System.IO.StreamWriter($AzDoTokenPipe)
                $reader = New-Object System.IO.StreamReader($AzDoTokenPipe)

                $input = "Get-AzDoToken"
                
                # Send command to the server
                $writer.WriteLine($input)
                $writer.Flush()
                
                $response = $reader.ReadLine()
                $result = $response | ConvertFrom-Json

                if (![string]::IsNullOrWhiteSpace($result["Token"])) {
                    $expTime = $result["Expiration"]
                    Write-Host "Access Token Generated with expiration time of $expTime seconds"
                    return $result["Token"]
                }
                else 
                {
                    throw $result["ErrorMessage"]
                }
            }

            ' + $joinedContents + '
        }
        finally 
        {
            try {
                $writer = New-Object System.IO.StreamWriter($AzDoTokenPipe)
                $writer.WriteLine("Stop-Pipe")
                $writer.Flush()

                $writer.Dispose()
                $AzDoTokenPipe.Dipose()
            }
            catch
            {
                # Do nothing
            }
        }'
    } 
    else {
        $joinedContents = '
        
        function Get-AzDoToken {
            return "' + $systemAccessToken + '" 
        }

        ' + $joinedContents;
    }

    Write-Host $joinedContents

    # Write the script to disk.
    Assert-VstsAgent -Minimum '2.115.0'
    $tempDirectory = Get-VstsTaskVariable -Name 'agent.tempDirectory' -Require
    Assert-VstsPath -LiteralPath $tempDirectory -PathType 'Container'
    $filePath = [System.IO.Path]::Combine($tempDirectory, "$([System.Guid]::NewGuid()).ps1")
    $null = [System.IO.File]::WriteAllText(
        $filePath,
        $joinedContents,
        ([System.Text.Encoding]::UTF8))

    # Prepare the external command values.
    #
    # Note, use "-Command" instead of "-File". On PowerShell v4 and V3 when using "-File", terminating
    # errors do not cause a non-zero exit code.
    if ($input_pwsh) {
        $powershellPath = Get-Command -Name pwsh.exe -CommandType Application | Select-Object -First 1 -ExpandProperty Path
    }
    else {
        $powershellPath = Get-Command -Name powershell.exe -CommandType Application | Select-Object -First 1 -ExpandProperty Path
    }
    $executionOperator;
    if ($input_runScriptInSeparateScope) {
        $executionOperator = '&'; 
    }
    else {
        $executionOperator = '.';
    }
    Assert-VstsPath -LiteralPath $powershellPath -PathType 'Leaf'
    $arguments = "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Unrestricted -Command `"$executionOperator '$($filePath.Replace("'", "''"))'`""
    $splat = @{
        'FileName'         = $powershellPath
        'Arguments'        = $arguments
        'WorkingDirectory' = $input_workingDirectory
    }

    # Switch to "Continue".
    $global:ErrorActionPreference = 'Continue'
    $failed = $false

    # Run the script.
    Write-Host '========================== Starting Command Output ==========================='
    if (!$input_failOnStderr) {
        Invoke-VstsTool @splat
    }
    else {
        $inError = $false
        $errorLines = New-Object System.Text.StringBuilder
        Invoke-VstsTool @splat 2>&1 |
        ForEach-Object {
            if ($_ -is [System.Management.Automation.ErrorRecord]) {
                # Buffer the error lines.
                $failed = $true
                $inError = $true
                $null = $errorLines.AppendLine("$($_.Exception.Message)")

                # Write to verbose to mitigate if the process hangs.
                Write-Verbose "STDERR: $($_.Exception.Message)"
            }
            else {
                # Flush the error buffer.
                if ($inError) {
                    $inError = $false
                    $message = $errorLines.ToString().Trim()
                    $null = $errorLines.Clear()
                    if ($message) {
                        Write-VstsTaskError -Message $message -IssueSource $IssueSources.CustomerScript
                    }
                }

                Write-Host "$_"
            }
        }

        # Flush the error buffer one last time.
        if ($inError) {
            $inError = $false
            $message = $errorLines.ToString().Trim()
            $null = $errorLines.Clear()
            if ($message) {
                Write-VstsTaskError -Message $message -IssueSource $IssueSources.CustomerScript
            }
        }
    }

    # Fail on $LASTEXITCODE
    if (!(Test-Path -LiteralPath 'variable:\LASTEXITCODE')) {
        $failed = $true
        Write-Verbose "Unable to determine exit code"
        Write-VstsTaskError -Message (Get-VstsLocString -Key 'PS_UnableToDetermineExitCode')
    }
    else {
        if ($LASTEXITCODE -ne 0) {
            $failed = $true
            Write-VstsTaskError -Message (Get-VstsLocString -Key 'PS_ExitCode' -ArgumentList $LASTEXITCODE)
        }
    }

    # Fail if any errors.
    if ($failed) {
        Write-VstsSetResult -Result 'Failed' -Message "Error detected" -DoNotThrow
    }
}
catch {
    Write-VstsTaskError -Message $_.Exception.Message
    Write-VstsSetResult -Result 'Failed' -Message "Error detected" -DoNotThrow
}
finally {
    Start-Sleep 10
    Write-Host $env:praval
    Trace-VstsLeavingInvocation $MyInvocation
}
