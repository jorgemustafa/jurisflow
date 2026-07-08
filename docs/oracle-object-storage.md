# Oracle Object Storage

Production stores documents in a private Standard-tier OCI bucket. API authenticates through VM instance principal; no permanent OCI key is stored.

## 1. Create bucket

In OCI Console:

1. Open **Storage > Object Storage & Archive Storage > Buckets**.
2. Select production compartment and **Create Bucket**.
3. Name it `magistrum-documents` or another non-sensitive name.
4. Select **Standard** storage tier.
5. Keep **Public Access: NoPublicAccess**.
6. Keep versioning and auto-tiering disabled for v1.
7. Record bucket name, region, namespace, and compartment name/OCID.

Standard gives immediate preview/download. OCI buckets are private by default and Oracle manages encryption at rest.

## 2. Create VM dynamic group

Copy production VM OCID from **Compute > Instances > instance details**.

Current OCI Console path:

1. Open main menu (`☰`).
2. Select **Identity & Security > Domains**.
3. Open **Default domain** (or domain used by tenancy).
4. In domain details, select **Dynamic groups**.
5. Select **Create dynamic group**.

If **Identity & Security** is not visible, use top search for `Domains` and open service result. If **Dynamic groups** is absent inside domain, logged user lacks Identity Domain Administrator, Security Administrator, or equivalent IAM permission.

Create:

- Name: `magistrum-api-vm`
- Matching rule:

```text
ALL {instance.id = '<PRODUCTION_VM_OCID>'}
```

Using instance OCID limits access to this VM instead of every VM in compartment.

## 3. Create least-privilege policy

Open **Identity & Security > Policies** in bucket compartment. Create policy `magistrum-documents`:

```text
Allow dynamic-group magistrum-api-vm to manage objects in compartment <COMPARTMENT_NAME> where target.bucket.name = 'magistrum-documents'
```

For non-default identity domain, use `<DOMAIN_NAME>/magistrum-api-vm`. Policy permits object upload, read, and deletion only in selected bucket. API cannot create or change buckets.

## 4. Configure production

Add to `.env.prod` on VM:

```dotenv
OCI_REGION=sa-saopaulo-1
OCI_OBJECT_NAMESPACE=<OBJECT_STORAGE_NAMESPACE>
OCI_OBJECT_BUCKET=magistrum-documents
DOCUMENT_MAX_SIZE_BYTES=26214400
ENABLE_DOCUMENT_PURGE=true
```

Find namespace under **Profile > Tenancy details > Object Storage namespace**. Size uses bytes; default shown is 25 MiB.

Validate and deploy:

```bash
npm run prod:config
npm run prod:up
```

## 5. Verify

1. Log into Magistrum.
2. Upload small PDF linked to a client.
3. Confirm object appears in private bucket under `<client-id>/`.
4. Preview PDF, then download it.
5. Delete document; it disappears from UI while object remains.
6. Permanent purge runs at API startup and every 24 hours for files whose 30-day retention expired.

## Local development

Local development also uses OCI. Create `.oci/config` and `.oci/key.pem`; both are ignored by Git. Configure the OCI API-key profile so `key_file` points to `/root/.oci/key.pem`, then fill `OCI_REGION`, `OCI_OBJECT_NAMESPACE`, and `OCI_OBJECT_BUCKET` in `.env`. Docker mounts `.oci` read-only. Production does not use these keys; it uses instance principal.

## Troubleshooting

- Instance-principal metadata failure: verify container reaches `169.254.169.254` and VM belongs to dynamic group.
- `NotAuthorizedOrNotFound`: verify policy compartment, bucket, dynamic group, then allow time for IAM propagation.
- Missing OCI variable: run `npm run prod:config`, then fill reported `.env.prod` value.
- Upload `413`: file exceeds `DOCUMENT_MAX_SIZE_BYTES`.
- Preview fails after successful upload: verify `manage objects` includes read and object still exists.

References: [OCI private buckets](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/managingbuckets.htm), [bucket creation](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/managingbuckets_topic-To_create_a_bucket.htm), [dynamic groups](https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/iam/dynamic-group.html).
