import { STSClient } from '@aws-sdk/client-sts';
export interface CredentialsClientProps {
    profileName?: string;
    region?: string;
    proxyServer?: string;
}
export declare class CredentialsClient {
    profileName?: string;
    region?: string;
    private _stsClient?;
    private readonly requestHandler?;
    constructor(props: CredentialsClientProps);
    get stsClient(): STSClient;
    validateCredentials(expectedAccessKeyId?: string, roleChaining?: boolean): Promise<void>;
    private loadCredentials;
}
