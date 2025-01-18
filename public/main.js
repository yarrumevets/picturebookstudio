const bookWrapper = document.getElementById("book");
const storyTextLeft = document.getElementById("storytextleft");
const storyTextRight = document.getElementById("storytextright");
const pageNumberLeft = document.getElementById("pagenumberleft");
const pageNumberRight = document.getElementById("pagenumberright");

const storyPicLeft = document.getElementById("storypicleft");
const storyPicRight = document.getElementById("storypicright");

const bookCover = document.getElementById("bookcover");
const coverTitle = document.getElementById("covertitle");
const coverImage = document.getElementById("coverimage");
const coverOpenButton = document.getElementById("coveropen");

// Global book obj.
const book = {};

// ======================= API STUFF ==================== //

// Flip page
// @TODO: force pages to land on an odd page, except 0, such that pages 0, 1, 3, 5,..., N%2=0
// This will require another validation: moving up by 1 page will have no effect after page 0.
const flipPage = (numPages) => {
  if (numPages === 0) {
    console.error(
      "Invalid page flips: ",
      numPages,
      " Must be greater or less than zero."
    );
    return;
  }
  // Number of page flips is valid, so check page.
  let newPage = book.currentPage + numPages;
  if (newPage <= 0) {
    // Flipped to cover.
    bookCover.style.display = "flex";
    bookWrapper.style.display = "none";
    book.currentPage = 0;
    // Note: since the book cover never changes. It just needs to be shown at this point.
    // @TODO: when loading a book to a middle page is possible, we'll need to load the cover here to make sure.
    return;
  } else {
    // Not cover page
    if (book.currentPage === 0) {
      // Coming from title page...
      bookCover.style.display = "none";
      bookWrapper.style.display = "flex";
      book.currentPage = newPage;
      setPageNumbers();
      loadPageText();
      loadPageImages();
      return;
    } else {
      // Flip from internal page to internal page.
      book.currentPage = newPage;
      setPageNumbers();
      loadPageText();
      loadPageImages();
    }
  }
};
pageNumberLeft.onclick = () => flipPage(-2);
pageNumberRight.onclick = () => flipPage(2);

async function generateBook() {
  // @TODO: Add some source for a user prompt.
  const userPrompt = "";
  const messageData = {
    userPrompt,
  };
  const response = await fetch("./api/newbook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messageData),
  }).catch((err) => console.error("Error getting book: ", err));
  const bookResponse = await response.json();
  return bookResponse;
}

const generateImage = async (imagePrompt) => {
  const imageResponse = await fetch("./api/newpicture", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imagePrompt: imagePrompt }),
  }).catch((err) => console.error("Error getting image data: ", err));
  const pictureDataObj = await imageResponse.json();
  const pictureData = pictureDataObj.imageUrl.data[0];
  console.log("(IMAGE LOADED) ", pictureData.url);
  return pictureData.url;
};

const getPageImagePrompts = async (pageTexts) => {
  const imageResponse = await fetch("./api/imageprompts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pages: pageTexts }),
  }).catch((err) => console.error("Error getting image prompts: ", err));
  const imagePromptsData = await imageResponse.json();
  return imagePromptsData.pages;
};

// ========================= Front-end Stuff ================== //

const loadPageText = () => {
  console.log("<load page texts>");
  storyTextLeft.innerHTML = book.pageTexts[book.currentPage] || "";
  storyTextRight.innerHTML = book.pageTexts[book.currentPage + 1] || "";
};

const setPageNumbers = () => {
  if (book.currentPage > 0) {
    pageNumberLeft.innerHTML = book.currentPage;
    pageNumberRight.innerHTML = book.currentPage + 1;
  }
};

const loadPageImages = () => {
  storyPicLeft.style.backgroundImage = `url("${
    book.images[book.currentPage]
  }")`;
  storyPicRight.style.backgroundImage = `url("${
    book.images[book.currentPage + 1]
  }")`;
};

const killTime = async (seconds) => {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const initBook = async () => {
  console.log("INITIALIZING . . .");
  // Init values.
  book.coverImage = null;
  book.images = [];
  book.currentPage = 0;

  // Get book text content from api.
  const bookResponse = await generateBook();

  // Add data (text and title) from api to the book obj.
  book.pageTexts = bookResponse.pages;

  console.log("[PAGES] ", book.pageTexts);

  // Cover page
  book.title = bookResponse.title;
  coverTitle.innerHTML = book.title;

  // Add a first page element that has just the title.
  // This way all book pages match their array element.
  book.pageTexts.unshift(book.title); // add a blank element for page 0 (title).

  console.log("(BOOK PAGE TEXTS) ", book.pageTexts);

  // Load the first pages of the book text into dom.
  // Only need to do this here if we are allowing starting from a page > 0.
  // setPageNumbers();
  // loadPageText();

  // Get image descriptions based on story and pages.
  const imagePrompts = await getPageImagePrompts(book.pageTexts);

  console.log("(IMAGE PROMPTS) ", imagePrompts);

  // Get cover image.
  book.images[0] = await generateImage(imagePrompts[0]);
  coverImage.style.backgroundImage = `url("${book.images[0]}")`;

  // @TODO: Load image urls for remaining pages in some kind of loop ?
  book.images[1] = await generateImage(imagePrompts[1]);
  book.images[2] = await generateImage(imagePrompts[2]);

  // Reveal the open-cover button once the images for pages 1 and 2 have loaded.
  coverOpenButton.style.display = "inline";
  coverOpenButton.onclick = () => flipPage(1);

  // Load the rest of the pages.
  for (let i = 3; i < imagePrompts.length; i++) {
    // @TODO: Don't await here? Allow images to now load async.
    book.images[i] = await generateImage(imagePrompts[i]);
    killTime(1); // @TODO - need to find a better solution. Limited to 5 images / minute right now.
  }
  return;
};

initBook();

// @TODO: use this later for creating user-guided books
// // Trigger the send.
// inputField.addEventListener("keydown", (event) => {
//   if (event.key === "Enter") {
//     generateBook();
//   }
// });
// sendButton.onclick = () => {
//   generateBook();
// };
