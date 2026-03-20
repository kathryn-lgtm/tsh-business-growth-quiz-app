const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * MAP YOUR QUIZ ANSWERS TO CLEAN INTERNAL VALUES
 * Exact matches still work first, but some fields also have flexible matching.
 */
const STAGE_MAP = {
  "I have an idea but haven’t started yet": "idea",
  "I have an idea but haven't started yet": "idea",
  "I’ve recently launched and I’m finding my feet": "early",
  "I've recently launched and I'm finding my feet": "early",
  "I’ve been running my business for less than a year": "early",
  "I've been running my business for less than a year": "early",
  "I’ve been in business for 1–3 years": "growth",
  "I've been in business for 1–3 years": "growth",
  "My business is established and I’m ready to grow further": "scale",
  "My business is established and I'm ready to grow further": "scale",
  "I’ve started but it’s inconsistent": "early",
  "I've started but it's inconsistent": "early",
  "I am growing but want more traction": "growth",
  "I’m established and ready to scale": "scale",
  "I'm established and ready to scale": "scale"
};

const PATH_MAP = {
  "Business Clarity Pathway": "clarity",
  "Marketing & Visibility Pathway": "marketing",
  "Sales & Conversion Pathway": "sales",
  "Systems & Scaling Pathway": "systems"
};

function normalizeStage(rawStage) {
  return STAGE_MAP[String(rawStage || "").trim()] || "early";
}

function normalizeBusinessType(rawBusinessType) {
  const value = String(rawBusinessType || "").trim().toLowerCase();

  if (!value) {
    return "service";
  }

  if (
    value.includes("both") ||
    (value.includes("product") && value.includes("service")) ||
    value.includes("hybrid")
  ) {
    return "hybrid";
  }

  if (
    value.includes("physical product") ||
    value.includes("sell products") ||
    value.includes("product-based") ||
    value.includes("product based") ||
    value.includes("products") ||
    value.includes("product")
  ) {
    return "product";
  }

  if (
    value.includes("personal brand") ||
    value.includes("content-led") ||
    value.includes("content led") ||
    value.includes("creator")
  ) {
    return "creator";
  }

  if (value.includes("service") || value.includes("retail")) {
    return "service";
  }

  return "service";
}

function normalizePath(rawPath) {
  const trimmed = String(rawPath || "").trim();

  if (PATH_MAP[trimmed]) {
    return PATH_MAP[trimmed];
  }

  const value = trimmed.toLowerCase();

  if (value.includes("clarity")) {
    return "clarity";
  }

  if (value.includes("marketing") || value.includes("visibility")) {
    return "marketing";
  }

  if (value.includes("sales") || value.includes("conversion")) {
    return "sales";
  }

  if (value.includes("systems") || value.includes("scaling")) {
    return "systems";
  }

  return "clarity";
}

function getProfile({ stage, path }) {
  const normalizedStage = String(stage || "").trim().toLowerCase();
  const normalizedPath = String(path || "").trim().toLowerCase();

  if (normalizedStage === "idea") {
    return "get-clear";
  }

  if (normalizedStage === "early" && normalizedPath === "clarity") {
    return "get-clear";
  }

  if (
    normalizedStage === "early" &&
    (normalizedPath === "marketing" || normalizedPath === "clarity")
  ) {
    return "foundations";
  }

  if (
    (normalizedStage === "early" || normalizedStage === "growth") &&
    normalizedPath === "marketing"
  ) {
    return "get-seen";
  }

  if (normalizedStage === "growth" && normalizedPath === "sales") {
    return "sales-fix";
  }

  if (
    (normalizedStage === "growth" || normalizedStage === "scale") &&
    normalizedPath === "systems"
  ) {
    return "scale-systems";
  }

  if (
    normalizedStage === "scale" &&
    (normalizedPath === "marketing" || normalizedPath === "sales")
  ) {
    return "optimise-expand";
  }

  return "foundations";
}

/**
 * SUBTYPE LOGIC
 * Uses quiz answers to add a more personal layer inside each main segment.
 */
function getSubtype({ path, answers }) {
  const normalizedPath = String(path || "").trim().toLowerCase();

  const q7 = String(answers?.q7 || "").trim().toLowerCase();
  const q8 = String(answers?.q8 || "").trim().toLowerCase();
  const q9 = String(answers?.q9 || "").trim().toLowerCase();
  const q10 = String(answers?.q10 || "").trim().toLowerCase();
  const q11 = String(answers?.q11 || "").trim().toLowerCase();
  const q2 = String(answers?.q2 || "").trim().toLowerCase();

  // SEGMENT 1: GET CLEAR
  if (normalizedPath === "clarity") {
    if (
      q8.includes("clearer plan") ||
      q8.includes("not sure what marketing to focus on") ||
      q7.includes("clear growth plan")
    ) {
      return "scattered";
    }

    if (
      q9.includes("workshops") ||
      q2.includes("still working that out")
    ) {
      return "overthinker";
    }

    if (
      q11.includes("exploring") ||
      q10.includes("very limited")
    ) {
      return "doubter";
    }

    return "general";
  }

  // SEGMENT 2: GET SEEN
  if (normalizedPath === "marketing") {
    if (
      q7.includes("being seen by more people")
    ) {
      return "invisible";
    }

    if (
      q8.includes("branding or messaging isn’t clear") ||
      q8.includes("branding or messaging isn't clear")
    ) {
      return "messaging";
    }

    if (
      q10.includes("very limited") ||
      q10.includes("around 5 hours")
    ) {
      return "inconsistent";
    }

    return "general";
  }

  // SEGMENT 3: SELL BETTER
  if (normalizedPath === "sales") {
    if (
      q7.includes("increasing sales or bookings") &&
      q9.includes("done-for-you support")
    ) {
      return "leaky";
    }

    if (
      q9.includes("branding") ||
      q9.includes("content")
    ) {
      return "quiet";
    }

    if (
      q8.includes("more customers, leads or sales")
    ) {
      return "undervalued";
    }

    return "general";
  }

  // SEGMENT 4: SCALE SYSTEMS
  if (normalizedPath === "systems") {
    if (
      q8.includes("doing too much myself") ||
      q8.includes("need support")
    ) {
      return "bottleneck";
    }

    if (
      q8.includes("don’t have enough time") ||
      q8.includes("don't have enough time") ||
      q10.includes("very limited") ||
      q10.includes("around 5 hours")
    ) {
      return "busy";
    }

    if (
      q11.includes("serious about scaling") ||
      q11.includes("ready to actively grow")
    ) {
      return "plateau";
    }

    return "general";
  }

  return "general";
}

async function getShopifyAccessToken() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!clientId || !clientSecret || !storeDomain) {
    throw new Error("Missing Shopify environment variables.");
  }

  const response = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials"
    })
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`Failed to get Shopify access token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function subscribeCustomer(storeDomain, accessToken, customerId) {
  const response = await fetch(`https://${storeDomain}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken
    },
    body: JSON.stringify({
      query: `
        mutation customerEmailMarketingConsentUpdate($input: CustomerEmailMarketingConsentUpdateInput!) {
          customerEmailMarketingConsentUpdate(input: $input) {
            customer {
              id
              emailMarketingConsent {
                marketingState
                marketingOptInLevel
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        input: {
          customerId: customerId,
          emailMarketingConsent: {
            marketingState: "SUBSCRIBED",
            marketingOptInLevel: "SINGLE_OPT_IN",
            consentUpdatedAt: new Date().toISOString()
          }
        }
      }
    })
  });

  const data = await response.json();

  console.log("🔔 CONSENT RESPONSE:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(`Shopify consent HTTP error: ${JSON.stringify(data)}`);
  }

  const consentErrors =
    data?.data?.customerEmailMarketingConsentUpdate?.userErrors || [];

  if (consentErrors.length) {
    throw new Error(`Shopify consent userErrors: ${JSON.stringify(consentErrors)}`);
  }

  return data?.data?.customerEmailMarketingConsentUpdate?.customer;
}

async function createCustomerInShopify(payload) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = await getShopifyAccessToken();

  const { name, email, answers, result } = payload;

  // Raw human-readable values from the quiz
  const rawStage = answers?.q1 || "";
  const rawBusinessType = answers?.q2 || "";
  const rawPrimaryPath = result?.primary_pathway || "";

  // Clean internal values for automation
  const stage = normalizeStage(rawStage);
  const businessType = normalizeBusinessType(rawBusinessType);
  const path = normalizePath(rawPrimaryPath);
  const profile = getProfile({ stage, path });
  const subtype = getSubtype({ path, answers });

  console.log("🧠 PROFILE RESOLUTION:");
  console.log({
    rawStage,
    rawBusinessType,
    rawPrimaryPath,
    stage,
    businessType,
    path,
    profile,
    subtype,
    q7: answers?.q7 || "",
    q8: answers?.q8 || "",
    q9: answers?.q9 || "",
    q10: answers?.q10 || "",
    q11: answers?.q11 || ""
  });

  const tags = [
    "Quiz Lead",
    "source:quiz",

    // Existing readable tags
    rawStage ? `Stage: ${rawStage}` : null,
    rawBusinessType ? `Business Type: ${rawBusinessType}` : null,
    rawPrimaryPath ? `Primary Path: ${rawPrimaryPath}` : null,

    // New machine-friendly tags
    `stage:${stage}`,
    `type:${businessType}`,
    `path:${path}`,
    `profile:${profile}`,
    `subtype:${subtype}`
  ].filter(Boolean);

  console.log("🏷️ TAGS GOING TO SHOPIFY:");
  console.log(tags);

  const createResponse = await fetch(`https://${storeDomain}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken
    },
    body: JSON.stringify({
      query: `
        mutation customerCreate($input: CustomerInput!) {
          customerCreate(input: $input) {
            customer {
              id
              firstName
              email
              tags
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        input: {
          firstName: name || "Quiz Lead",
          email: email,
          tags: tags
        }
      }
    })
  });

  const createData = await createResponse.json();

  if (!createResponse.ok) {
    throw new Error(`Shopify customerCreate HTTP error: ${JSON.stringify(createData)}`);
  }

  const createErrors = createData?.data?.customerCreate?.userErrors || [];
  if (createErrors.length) {
    throw new Error(`Shopify customerCreate userErrors: ${JSON.stringify(createErrors)}`);
  }

  const customer = createData?.data?.customerCreate?.customer;
  if (!customer?.id) {
    console.error("❌ No customer returned:", JSON.stringify(createData, null, 2));
    throw new Error(`Shopify customerCreate returned no customer ID: ${JSON.stringify(createData)}`);
  }

  await subscribeCustomer(storeDomain, accessToken, customer.id);

  return {
    ...customer,
    resolvedProfile: profile,
    resolvedStage: stage,
    resolvedBusinessType: businessType,
    resolvedPath: path,
    resolvedSubtype: subtype
  };
}

app.get("/", (req, res) => {
  res.send("TSH Business Growth Quiz backend is running.");
});

app.get("/quiz-submit", (req, res) => {
  res.json({
    ok: true,
    message: "Quiz proxy GET is working"
  });
});

app.post("/quiz-submit", async (req, res) => {
  console.log("QUIZ DATA RECEIVED:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const customer = await createCustomerInShopify(req.body);

    res.json({
      ok: true,
      message: "Saved successfully",
      customer
    });
  } catch (error) {
    console.error("SHOPIFY SYNC ERROR:");
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Submission received, but Shopify sync failed.",
      error: error.message || String(error)
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});