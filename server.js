const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * MAP YOUR QUIZ ANSWERS TO CLEAN INTERNAL VALUES
 * Update the left-hand text here if your exact quiz answer wording is different.
 */
const STAGE_MAP = {
  "I have an idea but haven’t started yet": "idea",
  "I have an idea but haven't started yet": "idea",
  "I’ve started but it’s inconsistent": "early",
  "I've started but it's inconsistent": "early",
  "I am growing but want more traction": "growth",
  "I’m established and ready to scale": "scale",
  "I'm established and ready to scale": "scale"
};

const BUSINESS_TYPE_MAP = {
  "I run a service-based business": "service",
  "I sell products": "product",
  "I sell physical products": "product", // ✅ ADD THIS
  "I run a product-based business": "product",
  "I do both": "hybrid",
  "I run both a product and service-based business": "hybrid",
  "I’m building a personal brand or content-led business": "creator",
  "I'm building a personal brand or content-led business": "creator"
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
  return BUSINESS_TYPE_MAP[String(rawBusinessType || "").trim()] || "service";
}

function normalizePath(rawPath) {
  return PATH_MAP[String(rawPath || "").trim()] || "clarity";
}

function getProfile({ stage, path }) {
  const normalizedStage = String(stage || "").trim().toLowerCase();
  const normalizedPath = String(path || "").trim().toLowerCase();

  if (normalizedStage === "idea") {
    return "start";
  }

  if (normalizedStage === "early" && normalizedPath === "clarity") {
    return "start";
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

  console.log("🧠 PROFILE RESOLUTION:");
  console.log({
    rawStage,
    rawBusinessType,
    rawPrimaryPath,
    stage,
    businessType,
    path,
    profile
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
    `profile:${profile}`
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
    resolvedPath: path
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