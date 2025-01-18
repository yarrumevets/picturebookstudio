const express = require("express");
const app = express();
const port = process.env.PORT || 4123;

// Load config files
const openaiApiCreds = require("./openaiApiCreds.json");
const {
  systemRoleCreateBook,
  basePrompt,
  imageBasePrompt,
  systemRoleCreateImagePrompts,
} = require("./gptconfig.js");

// Middleware
app.use(express.static("public"));
app.use(express.json());

// Route / : Serve public folder
app.get("/", (req, res) => {
  res.sendFile("public/index.html", { root: __dirname });
});

// APIs:
// Create a new book.
app.post("/api/newbook", (req, res) => {
  const userPrompt = req.body.userPrompt || "";
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", `Bearer ${openaiApiCreds.openaiApiKey}`);

  var animals = [
    // ...and some non-animals...
    "golden retriever",
    "axolotl",
    "moose",
    "orca",
    "pigeon",
    "parrot",
    "alien",
    "cobra",
    "robot",
    "bat",
    "toaster",
  ];
  var names = [
    "Steve",
    "Yuri",
    "Kim",
    "Lee",
    "Ken",
    "Naomi",
    "Maya",
    "Maria",
    "Anna",
    "Sam",
    "Alex",
  ];

  const numPages = 4;

  var randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  var randomName = names[Math.floor(Math.random() * names.length)];

  const userPromptCombined =
    basePrompt +
    ` The main character is a ${randomAnimal} named ${randomName}. The story should be ${numPages} pages. ` +
    userPrompt;

  const raw = JSON.stringify({
    model: "gpt-4o", // "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: systemRoleCreateBook,
      },
      {
        role: "user",
        content: userPromptCombined,
      },
    ],
    temperature: 0.5,
    frequency_penalty: 0.6,
    presence_penalty: 0.3,
    max_tokens: 600,
    top_p: 0.9,
  });
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };
  console.log("Getting Story...");
  fetch("https://api.openai.com/v1/chat/completions", requestOptions)
    .then((response) => response.json())
    .then((jsonResult) => {
      // jsonResult = JSON.parse(result);
      console.log("jsonResult: ", jsonResult);
      if (jsonResult && jsonResult.choices && jsonResult.choices[0]) {
        const responseMessage = jsonResult.choices[0].message.content;
        console.log(responseMessage);
        return res.send(JSON.parse(responseMessage));
      } else {
        return res.send({ response: "No GPT response data." });
      }
    })
    .catch((error) => console.log("error", error));
});

// Create image prompts for each page of the book.
app.post("/api/imageprompts", (req, res) => {
  const pages = req.body.pages || "";
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", `Bearer ${openaiApiCreds.openaiApiKey}`);
  const pagesJson = `{"pages":${pages}}`;
  console.log("pagesJson: ", pagesJson);
  const raw = JSON.stringify({
    model: "gpt-4o", // "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: systemRoleCreateImagePrompts,
      },
      {
        role: "user",
        content: pagesJson,
      },
    ],
    temperature: 0.5,
    frequency_penalty: 0.6,
    presence_penalty: 0.3,
    max_tokens: 600,
    top_p: 0.9,
  });
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };
  console.log("Getting DALL-E prompts...");
  fetch("https://api.openai.com/v1/chat/completions", requestOptions)
    .then((response) => response.json())
    .then((jsonResult) => {
      // jsonResult = JSON.parse(result);
      console.log("jsonResult: ", jsonResult);
      if (jsonResult && jsonResult.choices && jsonResult.choices[0].message) {
        const responseMessage = jsonResult.choices[0].message.content;
        console.log("<><><> imageprompts: ", responseMessage);
        return res.send(JSON.parse(responseMessage));
      } else {
        return res.send({ response: "No GPT response data." });
      }
    })
    .catch((error) => console.log("error", error));

  // return res.send(JSON.parse(``));
});

app.post("/api/newpicture", (req, res) => {
  const imagePrompt = req.body.imagePrompt || "";
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append(
    "Authorization",
    `Bearer ${openaiApiCreds.openaiDallEApiKey}`
  );
  const prompt = imageBasePrompt + " Imagine: " + imagePrompt;
  const raw = JSON.stringify({
    model: "dall-e-2",
    size: "256x256",
    // model: "dall-e-3",
    // size: "1024x1024",
    prompt: prompt,
    n: 1,
  });
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };
  console.log("Getting DALL-E image (", prompt, ")...");
  fetch("https://api.openai.com/v1/images/generations", requestOptions)
    .then((response) => response.json())
    .then((result) => {
      console.log("image url: ", result);
      return res.status(200).send({ imageUrl: result });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).send("Error: " + error);
    });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// NOTES:
// presence_penalty:
//    Adjusting this can influence how often the model repeats the same concepts.
//    A higher value might help in maintaining creativity without deviating from the required structure.

// frequency_penalty:
//    Increasing this slightly can help prevent repetitive responses and
//    encourage the model to use a wider range of vocabulary while adhering to instructions.

// top_p:
//     This parameter controls the nucleus sampling,
//     where top_p = 1 means the model considers all possible tokens for each choice.
//     Adjusting this to a slightly lower value (e.g., 0.9) can help focus the model’s responses,
//     making them more concise and to the point.
