type Topic = { id: string; category: string; name: string; tag: string };
export function topicGroup(topic: Topic): string {
  if (topic.id.startsWith("license_")) return "Licenses & responsible reuse";
  if (topic.id.startsWith("file_")) {
    const family = topic.tag.split(":")[0];
    return `Files · ${family}`;
  }
  if (
    /chatgpt|claude/.test(topic.id) &&
    /connector|plugin|integration/i.test(topic.tag + topic.name)
  )
    return "AI · Integrations & tools";
  if (/gpu|nvidia|radeon|geforce|apple.*m[345]|hardware/i.test(topic.name))
    return "Hardware & workstations";
  if (
    topic.id.startsWith("ai_") &&
    /model|weights|reasoning|instruct/i.test(topic.tag + topic.name)
  )
    return "AI · Models & inference";
  if (topic.category === "AI Models & Assistants")
    return "AI · Concepts & workflows";
  return topic.category;
}
