import fs from 'fs';
import * as helpers from '../src/helpers';
describe('helpers', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('removes brackets from GitHub Actor', () => {
    expect(helpers.sanitizeGitHubVariables('foo[bot]')).toEqual('foo_bot_');
  });

  test('removes special characters from worflow names', () => {
    expect(helpers.sanitizeGitHubVariables('sdf234@#$%$^&*()_+{}|:"<>?')).toEqual('sdf234@__________+___:____');
  });

  test('can sleep', () => {
    const sleep = helpers.defaultSleep(10);
    expect(Promise.race([sleep, new Promise((_res, rej) => setTimeout(rej, 20))])).resolves;
  });

  test("backoff function doesn't retry non-retryable errors", async () => {
    const fn = jest.fn().mockRejectedValue('i am not retryable');
    await expect(helpers.retryAndBackoff(fn, false)).rejects.toMatch('i am not retryable');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  describe('saveCredentialsToConfig', () => {
    const mockCreds = {
      AccessKeyId: 'mockAccessKeyId',
      SecretAccessKey: 'mockSecretAccessKey',
      SessionToken: 'mockSessionToken',
    };

    const profileName = 'testProfile';
    const awsConfigFolder = `${process.env['HOME']}/.aws`;
    const awsCredentialsFile = `${awsConfigFolder}/credentials`;

    const mockFsFunctions = (folderExists: boolean, fileExists: boolean, existingContent: string = '') => {
      jest.spyOn(fs, 'existsSync').mockImplementation((path) => {
        if (path === awsConfigFolder) return folderExists;
        if (path === awsCredentialsFile) return fileExists;
        return false;
      });

      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => existingContent);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    };

    test('does nothing if profileName is undefined', async () => {
      mockFsFunctions(true, false);

      await helpers.saveCredentialsToConfig({ profileName: undefined, creds: mockCreds });

      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    test('does nothing if credentials are not provided', async () => {
      mockFsFunctions(true, false);

      await helpers.saveCredentialsToConfig({ profileName, creds: undefined });

      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    test('throws error if credentials are missing', async () => {
      mockFsFunctions(true, false);

      const incompleteCreds = {
        AccessKeyId: 'mockAccessKeyId',
        // SecretAccessKey is missing
        SessionToken: 'mockSessionToken',
      };

      await expect(helpers.saveCredentialsToConfig({ profileName, creds: incompleteCreds })).rejects.toThrow(
        "Can't export credentials to config, missing credentials"
      );

      const incompleteCreds2 = {
        // AccessKeyId is missing
        SecretAccessKey: 'mockSecretAccessKey',
        SessionToken: 'mockSessionToken',
      };

      await expect(helpers.saveCredentialsToConfig({ profileName, creds: incompleteCreds2 })).rejects.toThrow(
        "Can't export credentials to config, missing credentials"
      );

      const incompleteCreds3 = {
        AccessKeyId: 'mockAccessKeyId',
        SecretAccessKey: 'mockSecretAccessKey',
        // SessionToken is missing
      };

      await expect(helpers.saveCredentialsToConfig({ profileName, creds: incompleteCreds3 })).rejects.toThrow(
        "Can't export credentials to config, missing credentials"
      );
    });

    test('saves credentials to AWS config file', async () => {
      mockFsFunctions(true, false);

      await helpers.saveCredentialsToConfig({ profileName, creds: mockCreds });

      expect(fs.existsSync).toHaveBeenCalledWith(awsConfigFolder);
      expect(fs.existsSync).toHaveBeenCalledWith(awsCredentialsFile);
      expect(fs.writeFileSync).toHaveBeenCalledWith(awsCredentialsFile, expect.stringContaining(`[${profileName}]`));
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        awsCredentialsFile,
        expect.stringContaining(`aws_access_key_id=${mockCreds.AccessKeyId}`)
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        awsCredentialsFile,
        expect.stringContaining(`aws_secret_access_key=${mockCreds.SecretAccessKey}`)
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        awsCredentialsFile,
        expect.stringContaining(`aws_session_token=${mockCreds.SessionToken}`)
      );
    });

    test('creates AWS config folder if it does not exist', async () => {
      mockFsFunctions(false, false);

      await helpers.saveCredentialsToConfig({ profileName, creds: mockCreds });

      expect(fs.existsSync).toHaveBeenCalledWith(awsConfigFolder);
      expect(fs.mkdirSync).toHaveBeenCalledWith(awsConfigFolder, { recursive: true });
    });

    test('adds new profile to existing credentials file', async () => {
      const existingContent = `
        [existingProfile]
        aws_access_key_id=existingAccessKeyId
        aws_secret_access_key=existingSecretAccessKey
        aws_session_token=existingSessionToken
      `;
      mockFsFunctions(true, true, existingContent);

      await helpers.saveCredentialsToConfig({ profileName, creds: mockCreds });

      expect(fs.existsSync).toHaveBeenCalledWith(awsConfigFolder);
      expect(fs.existsSync).toHaveBeenCalledWith(awsCredentialsFile);
      expect(fs.readFileSync).toHaveBeenCalledWith(awsCredentialsFile, 'utf-8');
      expect(fs.writeFileSync).toHaveBeenCalledWith(awsCredentialsFile, expect.stringContaining(`[existingProfile]`));
      expect(fs.writeFileSync).toHaveBeenCalledWith(awsCredentialsFile, expect.stringContaining(`[${profileName}]`));
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        awsCredentialsFile,
        expect.stringContaining(`aws_access_key_id=${mockCreds.AccessKeyId}`)
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        awsCredentialsFile,
        expect.stringContaining(`aws_secret_access_key=${mockCreds.SecretAccessKey}`)
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        awsCredentialsFile,
        expect.stringContaining(`aws_session_token=${mockCreds.SessionToken}`)
      );
    });
  });
});
