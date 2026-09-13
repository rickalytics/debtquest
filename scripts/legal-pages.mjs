// Build the contact into the HTML so support also works without JavaScript.
export function getSupportEmail(value = "") {
  const email = value.trim();
  if (!email) return "";
  if (
    !/^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(
      email,
    )
  ) {
    throw new Error(
      "VITE_SUPPORT_EMAIL must be a valid, single support email address.",
    );
  }
  return email;
}

const topics = {
  support: ["Email support", "DebtQuest support"],
  privacy: ["Send a privacy request", "DebtQuest privacy request"],
  safety: ["Contact us about a concern", "DebtQuest circle safety concern"],
};

export function legalPages(email) {
  const contact = getSupportEmail(email);
  return {
    name: "debtquest-public-help",
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        if (!/\/(privacy|support)\.html$/.test(context.path)) return html;
        return html.replace(
          /<!-- debtquest:contact-(support|privacy|safety) -->/g,
          (_, topic) => {
            if (!contact) {
              return '<p class="contact-pending">Private email support will be available at launch. Please do not post account or financial details in public.</p>';
            }
            const [label, subject] = topics[topic];
            return `<p class="contact-action"><a class="contact-button" href="mailto:${contact}?subject=${encodeURIComponent(subject)}">${label}</a><span class="contact-address">${contact}</span></p>`;
          },
        );
      },
    },
  };
}
