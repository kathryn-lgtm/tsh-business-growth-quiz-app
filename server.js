const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

async function createCustomerInShopify(payload) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = await getShopifyAccessToken();

  const { name, email, answers, result } = payload;

  const tags = [
    "Quiz Lead",
    answers?.q1 ? `Stage: ${answers.q1}` : null,
    answers?.q2 ? `Business Type: ${answers.q2}` : null,
    result?.primary_pathway ? `Primary Path: ${result.primary_pathway}` : null
  ].filter(Boolean);

  const response = await fetch(`https://${storeDomain}/admin/api/2026-01/graphql.json`, {
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Shopify HTTP error: ${JSON.stringify(data)}`);
  }

  const userErrors = data?.data?.customerCreate?.userErrors || [];
  if (userErrors.length) {
    throw new Error(`Shopify userErrors: ${JSON.stringify(userErrors)}`);
  }

  return data?.data?.customerCreate?.customer;
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