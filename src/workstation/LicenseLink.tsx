import { learningLogin } from "../services/learningGate";

export function licenseTopic(value: string) {
  const license = value.toLowerCase();
  if (license.includes("health") || license === "hai-def")
    return "license_health_ai";
  if (license.includes("gemma")) return "license_gemma";
  if (
    license.includes("llama-2") ||
    license.includes("llama 2") ||
    license === "llama2"
  )
    return "license_llama2";
  if (license.includes("llama 3.3") || license === "llama3.3")
    return "license_llama33";
  if (license.includes("llama 3.2") || license === "llama3.2")
    return "license_llama32";
  if (license.includes("llama 3.1") || license === "llama3.1")
    return "license_llama31";
  if (license.includes("openrail++") || license.includes("open rail++"))
    return "license_openrail_plus";
  if (license.includes("openrail-m") || license.includes("open rail-m"))
    return "license_openrail_m";
  if (license.includes("apache")) return "license_apache_2";
  if (license.includes("cc-by-sa")) return "license_cc_by_sa_4";
  if (license.includes("cc-by-nc")) return "license_cc_by_nc_4";
  if (license.includes("cc-by")) return "license_cc_by_4";
  if (license.includes("mit")) return "license_mit";
  if (license.includes("bsd-3")) return "license_bsd_3";
  if (license.includes("bsd-2")) return "license_bsd_2";
  if (license.includes("agpl")) return "license_agpl_3";
  if (license.includes("gpl-3") || license.includes("gpl v3"))
    return "license_gpl_3";
  if (license.includes("mpl-2")) return "license_mpl_2";
  if (license.includes("cc0")) return "license_cc0";
  return "license_model_terms";
}

export default function LicenseLink({
  license,
  signedIn,
}: {
  license: string;
  signedIn: boolean;
}) {
  const path = `learn/${licenseTopic(license)}/`;
  return (
    <a
      href={signedIn ? path : learningLogin(path)}
      title="Learn about this license and its limitations"
    >
      {license || "Check model terms"}
    </a>
  );
}
