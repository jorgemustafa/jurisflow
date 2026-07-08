import common from "oci-common";
import objectstorage from "oci-objectstorage";

export type StoredFile = { body: Buffer; contentType?: string };

export interface DocumentStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

export class OciDocumentStorage implements DocumentStorage {
  private constructor(
    private readonly client: objectstorage.ObjectStorageClient,
    private readonly namespaceName: string,
    private readonly bucketName: string
  ) {}

  static async create(namespaceName: string, bucketName: string, region: string) {
    const provider = process.env.OCI_AUTH_METHOD === "config_file"
      ? new common.ConfigFileAuthenticationDetailsProvider(required("OCI_CONFIG_FILE"), process.env.OCI_CONFIG_PROFILE ?? "DEFAULT")
      : await new common.InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
    const client = new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
    client.regionId = region;
    return new OciDocumentStorage(client, namespaceName, bucketName);
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.putObject({
      namespaceName: this.namespaceName,
      bucketName: this.bucketName,
      objectName: key,
      putObjectBody: body,
      contentLength: body.length,
      contentType,
      ifNoneMatch: "*"
    });
  }

  async get(key: string) {
    const response = await this.client.getObject({
      namespaceName: this.namespaceName,
      bucketName: this.bucketName,
      objectName: key
    });
    const chunks: Buffer[] = [];
    for await (const chunk of response.value as NodeJS.ReadableStream) chunks.push(Buffer.from(chunk));
    return { body: Buffer.concat(chunks), contentType: response.contentType };
  }

  async delete(key: string) {
    await this.client.deleteObject({
      namespaceName: this.namespaceName,
      bucketName: this.bucketName,
      objectName: key
    });
  }
}

let storage: Promise<DocumentStorage> | undefined;

export function getDocumentStorage() {
  storage ??= OciDocumentStorage.create(required("OCI_OBJECT_NAMESPACE"), required("OCI_OBJECT_BUCKET"), required("OCI_REGION"));
  return storage;
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
