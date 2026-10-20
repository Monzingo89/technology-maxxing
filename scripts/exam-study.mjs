import fs from "node:fs";
import { additionalAcronymSources } from "./acronym-sources.mjs";

export const researchedAt = "2026-10-20";
const guide = (code) =>
  `https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/${code.toLowerCase()}`;
const comptia = (name) => `https://www.comptia.org/certifications/${name}`;
export const exams = [
  [
    "aplus-core1",
    "CompTIA A+ Core 1",
    "220-1201",
    "https://www.comptia.org/en-us/certifications/a/core-1-v15/",
    "Hardware, mobile devices, networking, virtualization, and troubleshooting",
  ],
  [
    "aplus-core2",
    "CompTIA A+ Core 2",
    "220-1202",
    "https://www.comptia.org/en-us/certifications/a/core-2-v15/",
    "Operating systems, security, software troubleshooting, and operational procedures",
  ],
  [
    "network",
    "CompTIA Network+",
    "N10-009",
    comptia("network"),
    "Network connectivity, implementation, operations, security, and troubleshooting",
  ],
  [
    "security",
    "CompTIA Security+",
    "SY0-701",
    "https://www.comptia.org/en-us/certifications/security/v7/",
    "Threats, security architecture, security operations, and governance",
  ],
  [
    "server",
    "CompTIA Server+",
    "",
    comptia("server"),
    "Server hardware, administration, storage, and disaster recovery",
  ],
  [
    "cloud",
    "CompTIA Cloud+",
    "",
    comptia("cloud"),
    "Cloud architecture, deployment, operations, and security",
  ],
  [
    "linux",
    "CompTIA Linux+",
    "",
    comptia("linux"),
    "Linux administration, security, networking, and automation",
  ],
  [
    "cysa",
    "CompTIA CySA+",
    "",
    comptia("cybersecurity-analyst"),
    "Threat detection, vulnerability management, and incident response",
  ],
  [
    "pentest",
    "CompTIA PenTest+",
    "",
    comptia("pentest"),
    "Authorized assessment, exploitation, and reporting",
  ],
  [
    "securityx",
    "CompTIA SecurityX",
    "",
    comptia("securityx"),
    "Advanced security engineering and architecture; formerly CASP+",
  ],
  [
    "cissp",
    "ISC2 CISSP",
    "2024 outline",
    "https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline",
    "Security and risk management; asset security; architecture; networks; IAM; testing; operations; software security",
  ],
  [
    "cc",
    "ISC2 CC",
    "",
    "https://www.isc2.org/certifications/cc/cc-certification-exam-outline",
    "Foundational security, access controls, networking, and operations",
  ],
  [
    "sscp",
    "ISC2 SSCP",
    "",
    "https://www.isc2.org/certifications/sscp/sscp-certification-exam-outline",
    "Practical security administration and operations",
  ],
  [
    "ccsp",
    "ISC2 CCSP",
    "",
    "https://www.isc2.org/certifications/ccsp/ccsp-certification-exam-outline",
    "Cloud concepts, data, platform, application, operations, and legal security",
  ],
  [
    "az900",
    "Azure Fundamentals",
    "AZ-900",
    guide("AZ-900"),
    "Cloud concepts, Azure architecture, services, management, and governance",
  ],
  [
    "az104",
    "Azure Administrator",
    "AZ-104",
    guide("AZ-104"),
    "Azure identity, governance, storage, compute, networking, and monitoring",
  ],
  [
    "az305",
    "Azure Solutions Architect",
    "AZ-305",
    guide("AZ-305"),
    "Identity, governance, monitoring, data, continuity, and infrastructure design",
  ],
  [
    "az700",
    "Azure Network Engineer",
    "AZ-700",
    guide("AZ-700"),
    "Azure networks, hybrid connectivity, application delivery, and network security",
  ],
  [
    "sc900",
    "Security, Compliance, and Identity Fundamentals",
    "SC-900",
    guide("SC-900"),
    "Microsoft identity, security, compliance, and shared responsibility",
  ],
  [
    "sc200",
    "Security Operations Analyst",
    "SC-200",
    guide("SC-200"),
    "Microsoft security operations, detections, investigations, and response",
  ],
  [
    "sc300",
    "Identity and Access Administrator",
    "SC-300",
    guide("SC-300"),
    "Microsoft Entra identity, access, workload identities, and governance",
  ],
  [
    "sc100",
    "Cybersecurity Architect",
    "SC-100",
    guide("SC-100"),
    "Security architecture, operations, identity, infrastructure, and applications",
  ],
  [
    "ai901",
    "Azure AI Fundamentals",
    "AI-901",
    guide("AI-901"),
    "AI concepts and implementation with Microsoft Foundry",
  ],
  [
    "ai103",
    "Azure AI Apps and Agents Developer",
    "AI-103",
    guide("AI-103"),
    "Foundry, generative and agentic AI, vision, text, and information extraction",
  ],
  [
    "dp900",
    "Azure Data Fundamentals",
    "DP-900",
    guide("DP-900"),
    "Core data, relational and nonrelational data, and analytics",
  ],
  [
    "ccna",
    "Cisco CCNA",
    "200-301",
    "https://www.cisco.com/site/us/en/learn/training-certifications/exams/ccna.html",
    "Network fundamentals, access, IP connectivity, IP services, security, and automation",
  ],
  [
    "aws-foundation",
    "AWS Cloud Practitioner",
    "CLF-C02",
    "https://aws.amazon.com/certification/certified-cloud-practitioner/",
    "AWS cloud concepts, security, technology, and billing",
  ],
  [
    "ai900-legacy",
    "Azure AI Fundamentals (retired)",
    "AI-900",
    "https://learn.microsoft.com/en-us/credentials/support/retired-certification-exams",
    "Legacy study material; use AI-901 for current preparation",
    "retired",
  ],
  [
    "ai102-legacy",
    "Azure AI Engineer (retired)",
    "AI-102",
    "https://learn.microsoft.com/en-us/credentials/support/retired-certification-exams",
    "Legacy study material; see AI-103 for current preparation",
    "retired",
  ],
].map(([id, name, code, url, scope, status = "current"]) => ({
  id,
  name,
  code,
  url,
  scope,
  status,
  researchedAt,
}));

const source = (label, url) => ({ label, url });
const hardwareSources = [
  source(
    "Intel processor documentation",
    "https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html",
  ),
];
const memorySources = [
  source(
    "Micron DRAM products and technical resources",
    "https://www.micron.com/products/memory/dram-components",
  ),
];
const firmwareSources = [
  source("UEFI specifications", "https://uefi.org/specifications"),
  source(
    "Microsoft TPM overview",
    "https://learn.microsoft.com/en-us/windows/security/hardware-security/tpm/trusted-platform-module-overview",
  ),
];
const storageSources = [
  source(
    "NVM Express specifications",
    "https://nvmexpress.org/specifications/",
  ),
  source("SNIA dictionary", "https://www.snia.org/education/online-dictionary"),
];
const displaySources = [
  source(
    "Samsung LCD backlighting and OLED pixels",
    "https://global.samsungdisplay.com/31148",
  ),
  source("VESA standards", "https://vesa.org/vesa-standards/"),
];
const networkSources = [
  source("IEEE 802 LAN/MAN standards", "https://www.ieee802.org/"),
  source("IETF Internet standards", "https://www.rfc-editor.org/standards"),
];
const securitySources = [
  source("NIST cybersecurity glossary", "https://csrc.nist.gov/glossary"),
];
const cloudSources = [
  source(
    "Azure fundamentals documentation",
    "https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/",
  ),
  source(
    "Azure architecture",
    "https://learn.microsoft.com/en-us/azure/architecture/",
  ),
];
const aiSources = [
  source(
    "Microsoft Foundry AI documentation",
    "https://learn.microsoft.com/en-us/azure/ai-foundry/",
  ),
  source(
    "Azure Machine Learning concepts",
    "https://learn.microsoft.com/en-us/azure/machine-learning/concept-automated-ml",
  ),
];
export const areas = {
  cpu: [
    "hardware",
    "Processors & system architecture",
    "aplus-core1 server",
    hardwareSources,
  ],
  memory: ["hardware", "Memory & modules", "aplus-core1 server", memorySources],
  firmware: [
    "hardware",
    "Firmware & boot",
    "aplus-core1 aplus-core2 server security",
    firmwareSources,
  ],
  storage: [
    "hardware",
    "Storage & interfaces",
    "aplus-core1 server",
    storageSources,
  ],
  bus: [
    "hardware",
    "Expansion buses",
    "aplus-core1 server",
    [source("PCI-SIG specifications", "https://pcisig.com/specifications")],
  ],
  power: [
    "hardware",
    "Power & safe servicing",
    "aplus-core1 server",
    [
      source(
        "Intel ATX power supply design guide",
        "https://www.intel.com/content/www/us/en/content-details/336521/power-supply-design-guide-for-desktop-platform-form-factors.html",
      ),
    ],
  ],
  display: [
    "hardware",
    "Screens & image formats",
    "aplus-core1",
    displaySources,
  ],
  mobile: [
    "hardware",
    "Mobile & cellular",
    "aplus-core1 network",
    [
      source(
        "GSMA technology resources",
        "https://www.gsma.com/solutions-and-impact/technologies/esim/",
      ),
    ],
  ],
  cable: [
    "networking",
    "Cables, plugs & legacy ports",
    "aplus-core1 network ccna",
    networkSources,
  ],
  usb: [
    "hardware",
    "USB, docks & display ports",
    "aplus-core1",
    [
      source("USB-IF specifications", "https://www.usb.org/documents"),
      source("VESA DisplayPort", "https://www.displayport.org/"),
    ],
  ],
  wireless: [
    "networking",
    "Wi-Fi & radio",
    "aplus-core1 network ccna",
    [
      source(
        "Wi-Fi Alliance technology",
        "https://www.wi-fi.org/discover-wi-fi",
      ),
      source("IEEE wireless LAN working group", "https://www.ieee802.org/11/"),
    ],
  ],
  network: [
    "networking",
    "Network architecture & switching",
    "network ccna security",
    networkSources,
  ],
  protocol: [
    "networking",
    "Protocols & logical ports",
    "aplus-core1 network security ccna",
    networkSources,
  ],
  crypto: [
    "cybersecurity",
    "Cryptography & trust",
    "security cissp sscp securityx",
    securitySources,
  ],
  identity: [
    "cybersecurity",
    "Identity & access",
    "security cissp sscp sc900 sc300",
    securitySources,
  ],
  defense: [
    "cybersecurity",
    "Defense & security operations",
    "security cissp sscp cysa securityx",
    securitySources,
  ],
  attack: [
    "cybersecurity",
    "Threats & application security",
    "security cissp cysa pentest",
    securitySources,
  ],
  risk: [
    "governance",
    "MIS, risk & continuity",
    "security cissp securityx",
    securitySources,
  ],
  cloud: [
    "cloud",
    "Cloud & virtualization",
    "cloud az900 az104 az305 ccsp aws-foundation",
    cloudSources,
  ],
  azure: [
    "cloud",
    "Azure & hybrid migration",
    "az104 az305 cloud",
    cloudSources,
  ],
  ops: [
    "devops",
    "Operations & legacy systems",
    "aplus-core2 server linux cloud",
    [
      source(
        "Microsoft Windows Server documentation",
        "https://learn.microsoft.com/en-us/windows-server/",
      ),
    ],
  ],
  data: [
    "data",
    "Data & integration",
    "dp900 cloud",
    [
      source(
        "Microsoft data fundamentals",
        "https://learn.microsoft.com/en-us/training/paths/azure-data-fundamentals-explore-core-data-concepts/",
      ),
    ],
  ],
  ai: [
    "ai",
    "AI & machine learning",
    "ai901 ai103 ai900-legacy ai102-legacy",
    aiSources,
  ],
};

export function readAcronyms(through = Infinity) {
  const directory = new URL("../data/acronyms/", import.meta.url);
  return fs
    .readdirSync(directory)
    .filter(
      (name) =>
        /^\d\d-.+\.txt$/.test(name) && Number(name.slice(0, 2)) <= through,
    )
    .sort()
    .flatMap((name) => {
      const batch = Number(name.slice(0, 2));
      const rows = fs
        .readFileSync(new URL(name, directory), "utf8")
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#"));
      if (rows.length !== 100)
        throw new Error(
          `${name}: expected exactly 100 entries, got ${rows.length}`,
        );
      return rows.map((line, index) => {
        const parts = line.split("|");
        if (parts.length !== 6 || parts.some((part) => !part.trim()))
          throw new Error(`${name}:${index + 1}: expected six nonempty fields`);
        const [area, term, expansion, meaning, mnemonic, distinction] = parts;
        if (!areas[area]) throw new Error(`Unknown area ${area}`);
        return { area, term, expansion, meaning, mnemonic, distinction, batch };
      });
    });
}

export function matchingTopic(entry, topics) {
  const aliases = {
    "cloud:S3": "aws_s3",
    "cloud:EBS": "aws_ebs",
    "cloud:EFS (AWS)": "aws_efs",
    "ai:GAN": "generative_adversarial_networks",
    "ai:VAE": "variational_autoencoders",
  };
  const canonical = topics.find(
    (topic) => topic.id === aliases[`${entry.area}:${entry.term}`],
  );
  if (canonical) return canonical;
  const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const term = normalize(entry.term);
  const full = normalize(entry.expansion);
  // Exact identities only: an Azure DNS service must not swallow the DNS concept.
  const identities = new Set([term, full, term + full, full + term]);
  const matches = topics.filter((topic) =>
    identities.has(normalize(topic.name)),
  );
  if (matches.length > 1)
    throw new Error(
      `Ambiguous existing topic for ${entry.term}: ${matches.map((t) => t.id)}`,
    );
  return matches[0];
}

const protocolRfcs = {
  IP: 791,
  IPv4: 791,
  IPv6: 8200,
  TCP: 9293,
  UDP: 768,
  DNS: 1034,
  DHCP: 2131,
  ARP: 826,
  ICMP: 792,
  NAT: 3022,
  HTTP: 9110,
  HTTPS: 9110,
  FTP: 959,
  SSH: 4251,
  SMTP: 5321,
  POP3: 1939,
  IMAP: 9051,
  NTP: 5905,
  SNMP: 3411,
  SIP: 3261,
  RTP: 3550,
  RTCP: 3550,
  IPsec: 4301,
  IKE: 7296,
  ESP: 4303,
  AH: 4302,
  GRE: 2784,
  RADIUS: 2865,
  "TACACS+": 8907,
  EAP: 3748,
  "EAP-TLS": 9190,
  PPP: 1661,
  PPPoE: 2516,
  LDAP: 4511,
  LDAPS: 4513,
  OAuth: 6749,
  HOTP: 4226,
  TOTP: 6238,
  HMAC: 2104,
  TLS: 8446,
  SSL: 6101,
  FQDN: 8499,
  UUID: 9562,
  OSPF: 2328,
  RIP: 2453,
  EIGRP: 7868,
  HSRP: 2281,
  VRRP: 9568,
  MPLS: 3031,
  L2TP: 2661,
  PPTP: 2637,
  QUIC: 9000,
  DNSSEC: 4033,
  DoH: 8484,
  DoT: 7858,
  "HTTP/1.1": 9112,
  "HTTP/2": 9113,
  "HTTP/3": 9114,
  "TLS 1.2": 5246,
  "TLS 1.3": 8446,
  "SMTP AUTH": 4954,
  MIME: 2045,
  MSS: 9293,
  TTL: 791,
  DSCP: 2474,
  ECN: 3168,
  RED: 2309,
  WRED: 2309,
  CAPWAP: 5415,
  DANE: 6698,
  SPF: 7208,
  DKIM: 6376,
  DMARC: 7489,
  MTA: 5321,
  MUA: 5598,
  MDA: 5598,
  MX: 1035,
  PTR: 1035,
  CNAME: 1035,
  TXT: 1035,
  SOA: 1035,
  NS: 1035,
  SRV: 2782,
  CAA: 8659,
  AXFR: 5936,
  IXFR: 1995,
  EDNS: 6891,
  mDNS: 6762,
  "DNS-SD": 6763,
  AS: 1930,
  ASN: 6793,
  "IS-IS": 1195,
  LSA: 2328,
  "DR (OSPF)": 2328,
  BDR: 2328,
  ECMP: 2992,
  VRF: 4364,
  "RD (routing)": 4364,
  "RT (routing)": 4364,
  VTEP: 7348,
  VXLAN: 7348,
  EVPN: 7432,
  "MP-BGP": 4760,
  BFD: 5880,
  IGMP: 3376,
  MLD: 3810,
  "PIM (multicast)": 7761,
  SSM: 4607,
  NAT64: 6146,
  DNS64: 6147,
  "6to4": 7526,
};
const wellKnownPorts = {
  FTP: "TCP 21 control; TCP 20 is commonly used for active-mode data. Passive data ports are negotiated",
  SSH: "TCP 22",
  SFTP: "TCP 22 (over SSH)",
  DNS: "UDP and TCP 53",
  DHCP: "UDP 67 server and UDP 68 client (DHCPv4)",
  HTTP: "TCP 80 by default",
  HTTPS: "TCP 443 commonly; HTTP/3 uses QUIC over UDP 443",
  SMTP: "TCP 25 relay; TCP 587 submission; TCP 465 implicit-TLS submission",
  POP3: "TCP 110; TCP 995 with implicit TLS",
  IMAP: "TCP 143; TCP 993 with implicit TLS",
  LDAP: "TCP 389; StartTLS can upgrade this connection",
  LDAPS: "TCP 636",
  RDP: "TCP and UDP 3389 commonly",
  SMB: "TCP 445 for direct-hosted SMB",
  SNMP: "UDP 161 queries and UDP 162 notifications commonly",
  NTP: "UDP 123",
  RADIUS:
    "UDP 1812 authentication and UDP 1813 accounting traditionally; secure transports use other arrangements",
  "TACACS+": "TCP 49",
  SIP: "UDP or TCP 5060 commonly; TLS commonly TCP 5061",
  IKE: "UDP 500; NAT traversal commonly UDP 4500",
  FTPS: "Explicit TLS commonly TCP 21; implicit TLS commonly TCP 990",
  DoH: "TCP 443 commonly; HTTP/3-based deployments can use UDP 443",
  DoT: "TCP 853 by default",
  "HTTP/1.1": "TCP 80 commonly; HTTPS commonly uses TCP 443",
  "HTTP/2": "TCP 443 commonly for HTTPS",
  "HTTP/3": "UDP 443 commonly for HTTPS over QUIC",
  L2TP: "UDP 1701; IPsec-protected deployments also use IPsec/IKE transport",
  BGP: "TCP 179",
  TFTP: "UDP 69 for the initial request; a selected transfer identifier is used for the transfer",
  NFS: "TCP 2049 commonly for NFSv4; older arrangements can use additional RPC services",
  VXLAN: "UDP 4789 by default",
  mDNS: "UDP 5353",
  CAPWAP: "UDP 5246 control and UDP 5247 data commonly",
  BFD: "UDP 3784 for single-hop control; UDP 3785 for supported echo traffic",
  "SMB 1":
    "TCP 445 for direct-hosted SMB; older NetBIOS arrangements use additional ports",
  "SMB 2": "TCP 445 commonly",
  "SMB 3":
    "TCP 445 commonly; supported alternate transports have their own requirements",
  WinRM: "TCP 5985 for HTTP and TCP 5986 for HTTPS by default",
  RoCE: "RoCEv2 commonly uses UDP 4791; RoCEv1 is an Ethernet-layer protocol",
};

export function acronymTopic(entry) {
  const [cat, group, examList, defaultDocs] = areas[entry.area];
  let docs = protocolRfcs[entry.term]
    ? [
        source(
          `IETF RFC ${protocolRfcs[entry.term]}`,
          `https://www.rfc-editor.org/rfc/rfc${protocolRfcs[entry.term]}`,
        ),
      ]
    : defaultDocs;
  if (/^HDMI/.test(entry.term))
    docs = [
      source("HDMI specification overview", "https://www.hdmi.org/spec/hdmi2"),
    ];
  if (/^DP(?: |$)|^DVI/.test(entry.term))
    docs = [
      source(
        "VESA DisplayPort interfaces and compatibility",
        "https://www.displayport.org/faq/",
      ),
    ];
  if (entry.term === "USB PD" || entry.term === "PPS")
    docs = [
      source("USB-IF Power Delivery", "https://www.usb.org/usb-charger-pd"),
    ];
  if (/^Wi-Fi/.test(entry.term) || entry.term === "MLO")
    docs = [
      source(
        "Wi-Fi Alliance MAC/PHY generations",
        "https://www.wi-fi.org/wi-fi-macphy",
      ),
    ];
  if (entry.term === "PCIe 7.0")
    docs = [
      source(
        "PCI-SIG PCIe 7.0 data rate",
        "https://pcisig.com/what-data-rate-pcie-70-specification",
      ),
    ];
  if (entry.term === "OIDC")
    docs = [
      source(
        "OpenID Connect Core",
        "https://openid.net/specs/openid-connect-core-1_0.html",
      ),
    ];
  if (entry.term === "CVE")
    docs = [source("CVE Program", "https://www.cve.org/")];
  if (entry.term === "CVSS")
    docs = [source("FIRST CVSS standard", "https://www.first.org/cvss/")];
  if (entry.term === "KEV")
    docs = [
      source(
        "CISA Known Exploited Vulnerabilities catalog",
        "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
      ),
    ];
  const specificSources = {
    CUDA: ["NVIDIA CUDA documentation", "https://developer.nvidia.com/cuda"],
    ROCm: ["AMD ROCm documentation", "https://rocm.docs.amd.com/en/latest/"],
    TPU: [
      "Google TPU introduction",
      "https://docs.cloud.google.com/tpu/docs/intro-to-tpu",
    ],
    MIPI: [
      "MIPI current specifications",
      "https://www.mipi.org/current-specifications",
    ],
    DSI: [
      "MIPI display specifications",
      "https://www.mipi.org/current-specifications",
    ],
    I2C: [
      "NXP I2C-bus specification and user manual",
      "https://www.nxp.com/docs/en/user-guide/UM10204.pdf",
    ],
    COBIT: ["ISACA COBIT framework", "https://www.isaca.org/resources/cobit"],
    CIS: [
      "Center for Internet Security controls",
      "https://www.cisecurity.org/controls",
    ],
    "CIS Controls": [
      "CIS Critical Security Controls",
      "https://www.cisecurity.org/controls",
    ],
    HIPAA: ["US HHS HIPAA information", "https://www.hhs.gov/hipaa/index.html"],
    "NIST CSF": [
      "NIST Cybersecurity Framework",
      "https://www.nist.gov/cyberframework",
    ],
    "NIST SP 800-53": [
      "NIST SP 800-53 Revision 5",
      "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    ],
    ICS: [
      "NIST SP 800-82 OT security guide",
      "https://csrc.nist.gov/pubs/sp/800/82/r3/final",
    ],
    OT: [
      "NIST SP 800-82 OT security guide",
      "https://csrc.nist.gov/pubs/sp/800/82/r3/final",
    ],
    SCADA: [
      "NIST SP 800-82 OT security guide",
      "https://csrc.nist.gov/pubs/sp/800/82/r3/final",
    ],
    PLC: [
      "NIST SP 800-82 OT security guide",
      "https://csrc.nist.gov/pubs/sp/800/82/r3/final",
    ],
  };
  if (specificSources[entry.term])
    docs = [source(...specificSources[entry.term])];
  docs = additionalAcronymSources(entry) || docs;
  const extraExams = {
    "MI (identity)": "sc300 sc900 ai103 ccsp",
    UAMI: "sc300 ai103 ccsp",
    SAMI: "sc300 ai103 ccsp",
    "PE (Azure)": "az700 ai103 ccsp",
    PLS: "az700 ccsp",
    AGW: "az700",
    LB: "az700",
    ILB: "az700",
    AMPLS: "az700",
    AMA: "sc200",
    NFS: "network linux cloud",
    CMK: "az104 cissp ccsp",
    DEK: "security cissp ccsp",
    KEK: "security cissp ccsp",
    BYOK: "az104 cissp ccsp",
    RLS: "security ccsp",
    TPM: "cissp sscp ccsp",
    VPN: "network cissp az700 security",
    VNet: "az700",
    NSG: "az700",
    ASG: "az700",
    UDR: "az700",
    NVA: "az700",
    S2S: "az700",
    P2S: "az700",
    ER: "az700",
    BGP: "network ccna az700",
    KQL: "sc200",
    SIEM: "sc200",
    SOAR: "sc200",
    PAM: "cissp sc300",
    PIM: "az104 sc300",
    MFA: "sc900 sc300 az900 ai103",
    SSO: "sc900 sc300 az900",
    RBAC: "az104 az900 ai103 ccsp",
    DLP: "sc900 ccsp",
    CASB: "sc900 ccsp",
    CSPM: "sc100 ccsp",
    AI: "az900",
    API: "ai901 ai103",
    CLI: "az104 ai901",
    "AD DS": "sc300",
    "AD FS": "sc300",
    RTO: "az305 cloud ccsp",
    RPO: "az305 cloud ccsp",
    MDM: "aplus-core2 security",
    BYOD: "aplus-core2 security",
  };
  const examIds = new Set(
    `${examList} ${extraExams[entry.term] || ""}`.trim().split(/\s+/),
  );
  if (["network", "protocol", "wireless"].includes(entry.area))
    examIds.add("cissp");
  if (["identity", "defense", "risk"].includes(entry.area)) examIds.add("cc");
  if (["identity", "crypto", "defense"].includes(entry.area))
    examIds.add("sc100");
  if (entry.area === "crypto")
    for (const id of ["ccsp", "sc900"]) examIds.add(id);
  const id = `acronym_${entry.area}_${entry.term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_$/, "")}`;
  return {
    id,
    name: `${entry.term} — ${entry.expansion}`,
    cat,
    tag: entry.meaning,
    born: `Acronym study batch ${entry.batch} · reviewed ${researchedAt}`,
    history: entry.distinction,
    why: entry.meaning,
    rel: { seeAlso: [] },
    challenges: [
      `Without looking, expand ${entry.term}: ${entry.expansion}.`,
      `Recall this memory aid: ${entry.mnemonic}`,
      `Explain the practical use: ${entry.meaning}`,
      `Explain this distinction: ${entry.distinction}`,
      `Identify ${entry.term} in a device specification, architecture diagram, or system inventory.`,
    ],
    extension: {
      docs,
      historyNotes: [
        `Memory aid (a learning cue, not the expansion): ${entry.mnemonic}`,
      ],
      updatedAt: researchedAt,
    },
    study: {
      ...entry,
      group,
      exams: [...examIds],
      ports: wellKnownPorts[entry.term],
      sources: docs,
    },
  };
}

// Many-to-many study relevance, not a promise that a term appears on an exam.
// Existing catalog topics also receive transparent, conservative relevance rules.
export function inferExamMappings(topic) {
  const text = `${topic.id} ${topic.name} ${topic.tag}`.toLowerCase();
  const mappings = new Map();
  const add = (ids, reason) =>
    ids
      .split(" ")
      .forEach((id) =>
        mappings.set(id, { examId: id, basis: "related", reason }),
      );
  if (topic.category === "Cloud")
    add(
      "cloud az900 ccsp",
      "Related cloud-services background; verify provider-specific objectives.",
    );
  if (/^azure[_ ]/.test(text))
    add(
      "az104 az305",
      "Azure resource administration or architecture background.",
    );
  if (/^aws_|^amazon /.test(text))
    add(
      "aws-foundation",
      "AWS service background for the published cloud-services scope.",
    );
  if (
    /^(linux|ubuntu|debian|rhel|centos|rocky_linux|alpine_linux|fedora)(\b|_)/.test(
      text,
    )
  )
    add("linux aplus-core2", "Operating-system administration background.");
  if (/^(windows|active_directory|powershell)(\b|_)/.test(text))
    add(
      "aplus-core2 server",
      "Windows administration and operating-system background.",
    );
  if (
    /\b(encryption|cryptography|ransomware|malware|firewall|zero trust|penetration testing|threat modeling|oauth|openid|saml)\b/.test(
      text,
    )
  )
    add(
      "security cissp sscp",
      "Related security concepts within the published security domains.",
    );
  if (
    /\b(siem|sentinel|defender|incident response|threat hunting)\b/.test(text)
  )
    add("cysa sc200", "Detection, investigation, and response background.");
  if (/\b(entra|conditional access|privileged identity)\b/.test(text))
    add(
      "sc300 sc900 az104",
      "Microsoft identity and access-management background.",
    );
  if (
    /\b(tcp|udp|dns|http|https|ipv4|ipv6|ethernet|subnet|routing|wi-fi)\b/.test(
      text,
    )
  )
    add(
      "network ccna",
      "Related networking fundamentals; protocol depth varies by exam.",
    );
  if (
    /\b(machine learning|neural network|generative ai|retrieval.augmented generation|natural language|computer vision|large language|reinforcement learning|embedding|fine.tuning)\b/.test(
      text,
    )
  )
    add(
      "ai901 ai103 ai900-legacy ai102-legacy",
      "AI concepts or implementation background; model catalogs are supplementary study.",
    );
  if (
    /\b(relational|sql|nosql|data warehouse|data lake|etl|database)\b/.test(
      text,
    )
  )
    add(
      "dp900",
      "Related core-data concepts; a product entry is supplementary background.",
    );
  return [...mappings.values()];
}

export function acronymQuestions(study, peers) {
  const dimensions = [
    [
      "expansion",
      `What does ${study.term} mean in this ${study.group.toLowerCase()} context?`,
      "Expansion",
    ],
    [
      "meaning",
      `Which function matches ${study.term} (${study.expansion})?`,
      "Function",
    ],
    [
      "mnemonic",
      `Which memory cue helps recall ${study.term} (${study.expansion})?`,
      "Recall cue",
    ],
    [
      "distinction",
      `Which distinction belongs to ${study.term} (${study.expansion})?`,
      "Distinction",
    ],
    [
      "group",
      `Which study area contains ${study.term} (${study.expansion})?`,
      "Study area",
    ],
  ];
  return dimensions.map(([key, question, skill], i) => {
    const correct = study[key];
    const alternatives = [
      ...new Set(
        peers
          .filter((peer) => peer.topicId !== study.topicId)
          .map((peer) => peer[key]),
      ),
    ].filter((value) => value !== correct);
    // Prefer nearby concepts, but rotate peers so successive cards differ.
    const offset =
      (study.term.charCodeAt(0) + i * 7) % Math.max(alternatives.length, 1);
    const choices = [
      ...alternatives.slice(offset),
      ...alternatives.slice(0, offset),
    ].slice(0, 3);
    if (choices.length !== 3)
      throw new Error(
        `${study.term}: not enough distinct distractors for ${key}`,
      );
    const options = [correct, ...choices];
    const answerIndex = (study.term.length + i) % 4;
    options.splice(answerIndex, 0, options.shift());
    return {
      id: `${study.topicId}-acronym-${i + 1}`,
      question,
      options,
      answerIndex,
      explanation: correct,
      sources: study.sources,
      skill,
      difficulty: "foundation",
    };
  });
}
