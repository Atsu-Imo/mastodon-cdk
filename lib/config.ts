type Config = {
  DomainName: string,
  SecretKeyBase: string,
  OtpSecret: string,
  VapidPrivateKey: string,
  VapidPublicKey: string,
  Spot: boolean,
  AlertingHttpsEndpoint: string | null,
  AlertingEmail: string | null,
  DatabaseAllocatedStorage: number,
}

export const defaultConfig:Config = {
    DomainName: 'string',
    SecretKeyBase: 'string',
    OtpSecret: 'string',
    VapidPrivateKey: 'string',
    VapidPublicKey: 'string',
    Spot: true,
    AlertingHttpsEndpoint: 'string',
    AlertingEmail: 'string',
    DatabaseAllocatedStorage: 2,
};