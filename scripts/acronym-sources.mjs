// Focused primary references for later batches. Memory cues are original study
// aids; sources support definitions and technical distinctions, not the cues.
const rfcs = {
  "AES-GCM": 5116,
  "AES-CBC": 3602,
  "AES-CTR": 3686,
  GCM: 5116,
  AEAD: 5116,
  AAD: 5116,
  HKDF: 5869,
  PBKDF2: 8018,
  "RSA-PSS": 8017,
  "RSA-OAEP": 8017,
  OAEP: 8017,
  PSS: 8017,
  "PKCS #12": 7292,
  PEM: 7468,
  "SAN (certificate)": 5280,
  EKU: 5280,
  KU: 5280,
  SKI: 5280,
  AKI: 5280,
  OID: 5280,
  mTLS: 8446,
  TGT: 4120,
  TGS: 4120,
  KDC: 4120,
  SCIM: 7644,
  "CA (identity)": null,
  CRLF: 9112,
  TFTP: 1350,
  RPC: 5531,
  NFS: 8881,
};
const groups = [
  [
    ["CBC", "CTR", "ECB", "IV"],
    "NIST block cipher modes",
    "https://csrc.nist.gov/pubs/sp/800/38/a/final",
  ],
  [
    ["KDF"],
    "NIST key derivation guidance",
    "https://csrc.nist.gov/pubs/sp/800/56/c/r2/final",
  ],
  [
    ["PKCS #11", "PKCS"],
    "OASIS PKCS #11 specification",
    "https://docs.oasis-open.org/pkcs11/pkcs11-spec/v3.1/os/pkcs11-spec-v3.1-os.html",
  ],
  [
    ["ASN.1", "DER"],
    "ITU-T ASN.1 resources",
    "https://www.itu.int/en/ITU-T/asn1/Pages/introduction.aspx",
  ],
  [
    ["gMSA", "sMSA"],
    "Microsoft managed service accounts",
    "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-service-accounts",
  ],
  [
    [
      "SID",
      "RID",
      "UPN",
      "SAM (accounts)",
      "SPN",
      "DACL",
      "SACL",
      "ACE",
      "SDDL",
    ],
    "Microsoft Windows authorization documentation",
    "https://learn.microsoft.com/en-us/windows/win32/secauthz/authorization-portal",
  ],
  [
    ["LAPS"],
    "Microsoft Windows LAPS overview",
    "https://learn.microsoft.com/en-us/windows-server/identity/laps/laps-overview",
  ],
  [
    ["PRT"],
    "Microsoft Entra primary refresh tokens",
    "https://learn.microsoft.com/en-us/entra/identity/devices/concept-primary-refresh-token",
  ],
  [
    ["CAE"],
    "Microsoft Entra continuous access evaluation",
    "https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation",
  ],
  [
    ["CA (identity)"],
    "Microsoft Entra Conditional Access",
    "https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview",
  ],
  [
    ["FIDO", "U2F", "UAF", "CTAP"],
    "FIDO Alliance specifications",
    "https://fidoalliance.org/specifications/",
  ],
  [
    ["WebAuthn"],
    "W3C Web Authentication specification",
    "https://www.w3.org/TR/webauthn-3/",
  ],
  [
    ["STIX"],
    "OASIS STIX 2.1",
    "https://docs.oasis-open.org/cti/stix/v2.1/os/stix-v2.1-os.html",
  ],
  [
    ["TAXII"],
    "OASIS TAXII 2.1",
    "https://docs.oasis-open.org/cti/taxii/v2.1/os/taxii-v2.1-os.html",
  ],
  [["ATT&CK"], "MITRE ATT&CK knowledge base", "https://attack.mitre.org/"],
  [["CWE"], "MITRE Common Weakness Enumeration", "https://cwe.mitre.org/"],
  [
    ["CAPEC"],
    "MITRE Common Attack Pattern Enumeration and Classification",
    "https://capec.mitre.org/",
  ],
  [
    ["CPE", "SCAP", "OVAL", "XCCDF"],
    "NIST Security Content Automation Protocol",
    "https://csrc.nist.gov/projects/security-content-automation-protocol",
  ],
  [
    ["CSAF", "CVRF", "VEX"],
    "OASIS Common Security Advisory Framework",
    "https://docs.oasis-open.org/csaf/csaf/v2.0/os/csaf-v2.0-os.html",
  ],
  [
    ["SLSA"],
    "SLSA supply-chain integrity specification",
    "https://slsa.dev/spec/",
  ],
  [["TLP"], "FIRST Traffic Light Protocol", "https://www.first.org/tlp/"],
  [
    ["STRIDE", "DREAD", "PASTA", "VAST"],
    "OWASP threat modeling guidance",
    "https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html",
  ],
  [
    ["IDOR", "BOLA", "XXE", "SSTI", "LDAPi"],
    "OWASP application security cheat sheets",
    "https://cheatsheetseries.owasp.org/",
  ],
  [
    ["OCTAVE"],
    "Carnegie Mellon SEI OCTAVE resources",
    "https://insights.sei.cmu.edu/library/introducing-octave-allegro-improving-the-information-security-risk-assessment-process/",
  ],
  [["FAIR"], "The Open Group Open FAIR", "https://www.opengroup.org/openfair"],
  [
    ["SPAN", "RSPAN", "ERSPAN"],
    "Cisco Switched Port Analyzer configuration",
    "https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/10570-41.html",
  ],
  [
    [
      "AOC",
      "DAC (cable)",
      "DDM",
      "DOM",
      "OM1",
      "OM2",
      "OM3",
      "OM4",
      "OM5",
      "OS1",
      "OS2",
      "WDM",
      "CWDM",
      "DWDM",
      "OTDR",
      "ODF",
    ],
    "SNIA optical networking and storage dictionary",
    "https://www.snia.org/resources/online-dictionary",
  ],
  [
    ["MI (identity)", "UAMI", "SAMI"],
    "Microsoft Azure managed identity types",
    "https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview",
  ],
  [
    ["AAD", "AAD DS"],
    "Microsoft Entra identity naming changes",
    "https://learn.microsoft.com/en-us/entra/fundamentals/new-name",
  ],
  [
    ["RG", "MG"],
    "Azure Resource Manager scope and organization",
    "https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview",
  ],
  [
    ["PE (Azure)", "PLS"],
    "Azure Private Link overview",
    "https://learn.microsoft.com/en-us/azure/private-link/private-link-overview",
  ],
  [
    ["VMSS"],
    "Azure Virtual Machine Scale Sets overview",
    "https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/overview",
  ],
  [
    ["LB", "ILB"],
    "Azure Load Balancer overview",
    "https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-overview",
  ],
  [
    ["AGW"],
    "Azure Application Gateway overview",
    "https://learn.microsoft.com/en-us/azure/application-gateway/overview",
  ],
  [
    ["AZ", "AS (availability)"],
    "Azure availability options for virtual machines",
    "https://learn.microsoft.com/en-us/azure/virtual-machines/availability",
  ],
  [
    ["AVM"],
    "Azure Verified Modules",
    "https://azure.github.io/Azure-Verified-Modules/",
  ],
  [
    ["AMPLS"],
    "Azure Monitor private-link access",
    "https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/private-link-security",
  ],
  [
    ["AMA", "MMA"],
    "Azure Monitor Agent and legacy-agent migration",
    "https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-overview",
  ],
  [
    ["DCE (Azure)"],
    "Azure Monitor data collection endpoints",
    "https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-endpoint-overview",
  ],
  [
    ["RADOS", "RBD", "CephFS"],
    "Ceph storage architecture",
    "https://docs.ceph.com/en/latest/architecture/",
  ],
  [
    ["S3"],
    "Amazon Simple Storage Service overview",
    "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html",
  ],
  [
    ["EBS"],
    "Amazon Elastic Block Store overview",
    "https://docs.aws.amazon.com/ebs/latest/userguide/what-is-ebs.html",
  ],
  [
    ["EFS (AWS)"],
    "Amazon Elastic File System overview",
    "https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html",
  ],
  [
    ["SMB 1", "SMB 2", "SMB 3", "CIFS"],
    "Microsoft Server Message Block overview",
    "https://learn.microsoft.com/en-us/windows-server/storage/file-server/file-server-smb-overview",
  ],
  [
    ["WinRM", "WS-Man"],
    "Microsoft Windows Remote Management",
    "https://learn.microsoft.com/en-us/windows/win32/winrm/portal",
  ],
  [
    ["PSRP"],
    "Microsoft PowerShell remoting protocol",
    "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-psrp/",
  ],
  [
    ["COM (software)", "DCOM", "OLE", "DDE"],
    "Microsoft component object model and OLE",
    "https://learn.microsoft.com/en-us/windows/win32/com/component-object-model--com--portal",
  ],
  [
    ["S2D", "CSV (cluster)", "WSFC", "RDMA", "RoCE"],
    "Microsoft Storage Spaces Direct architecture",
    "https://learn.microsoft.com/en-us/windows-server/storage/storage-spaces/storage-spaces-direct-overview",
  ],
  [
    ["VSS"],
    "Microsoft Volume Shadow Copy Service",
    "https://learn.microsoft.com/en-us/windows-server/storage/file-server/volume-shadow-copy-service",
  ],
  [
    ["SR-IOV"],
    "Microsoft single-root I/O virtualization",
    "https://learn.microsoft.com/en-us/windows-hardware/drivers/network/overview-of-single-root-i-o-virtualization--sr-iov-",
  ],
  [
    ["OLTP", "OLAP", "HTAP"],
    "Microsoft Azure data architecture guide",
    "https://learn.microsoft.com/en-us/azure/architecture/data-guide/",
  ],
  [
    ["SSIS", "DTS"],
    "Microsoft SQL Server Integration Services",
    "https://learn.microsoft.com/en-us/sql/integration-services/sql-server-integration-services",
  ],
  [
    ["SSAS"],
    "Microsoft Analysis Services",
    "https://learn.microsoft.com/en-us/analysis-services/analysis-services-overview",
  ],
  [
    ["SSRS"],
    "Microsoft Reporting Services",
    "https://learn.microsoft.com/en-us/sql/reporting-services/create-deploy-and-manage-mobile-and-paginated-reports",
  ],
  [
    ["TDE", "DEK", "KEK"],
    "Microsoft SQL transparent data encryption",
    "https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/transparent-data-encryption",
  ],
  [
    ["CMK", "BYOK", "HYOK"],
    "Microsoft Azure Key Vault key management",
    "https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys",
  ],
  [
    ["CMEK"],
    "Google Cloud customer-managed encryption keys",
    "https://cloud.google.com/kms/docs/cmek",
  ],
  [
    ["RLS"],
    "Microsoft SQL row-level security",
    "https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security",
  ],
  [
    ["DDM (database)"],
    "Microsoft SQL dynamic data masking",
    "https://learn.microsoft.com/en-us/sql/relational-databases/security/dynamic-data-masking",
  ],
  [
    ["DMV"],
    "Microsoft SQL dynamic management views",
    "https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/system-dynamic-management-views",
  ],
  [
    ["DACPAC"],
    "Microsoft data-tier applications",
    "https://learn.microsoft.com/en-us/sql/relational-databases/data-tier-applications/data-tier-applications",
  ],
  [
    ["SVM", "KNN", "LDA (classification)", "PCA", "t-SNE", "TF-IDF"],
    "scikit-learn machine learning user guide",
    "https://scikit-learn.org/stable/user_guide.html",
  ],
  [
    ["UMAP"],
    "UMAP reference documentation",
    "https://umap-learn.readthedocs.io/en/latest/",
  ],
  [
    ["GAN"],
    "Generative Adversarial Nets paper",
    "https://arxiv.org/abs/1406.2661",
  ],
  [
    ["VAE"],
    "Auto-Encoding Variational Bayes paper",
    "https://arxiv.org/abs/1312.6114",
  ],
  [
    ["DDPM"],
    "Denoising Diffusion Probabilistic Models paper",
    "https://arxiv.org/abs/2006.11239",
  ],
  [
    ["DiT"],
    "Scalable Diffusion Models with Transformers paper",
    "https://arxiv.org/abs/2212.09748",
  ],
  [["ViT"], "Vision Transformer paper", "https://arxiv.org/abs/2010.11929"],
  [
    ["VLA"],
    "RT-2 vision-language-action model paper",
    "https://arxiv.org/abs/2307.15818",
  ],
];

export function additionalAcronymSources(entry) {
  const number = rfcs[entry.term];
  if (number)
    return [
      {
        label: `IETF RFC ${number}`,
        url: `https://www.rfc-editor.org/rfc/rfc${number}`,
      },
    ];
  const group = groups.find(([terms]) => terms.includes(entry.term));
  return group ? [{ label: group[1], url: group[2] }] : null;
}
