const REACT_APP_SEED_PHRASE = "REACT_APP_SEED_PHRASE";
import { Dappeteer } from "@chainsafe/dappeteer";
import { Browser, ElementHandle, Page } from "puppeteer";
const dappeteer = require("@chainsafe/dappeteer");
const { getDocument, queries } = require("pptr-testing-library");

// Sometimes we need to round float values because bigint type does not exist (yet) in javascript
function ohmRound(val: string): number {
  var m = Math.pow(10, 10);
  return Math.round(parseFloat(val) * m) / m;
}

export const setupLogging = (page: Page) => {
  page
    .on("console", message => console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    .on("pageerror", ({ message }) => console.log(message));
};

export const clickElement = async (page: Page, selector: string) => {
  await page.bringToFront();
  await page.waitForSelector(selector);
  const element = await page.$(selector);
  if (!element) throw new Error("Could not find element with selector " + selector);

  await element.click();
};

const getMetamaskSeedPhrase = (): string => {
  if (!process.env.REACT_APP_SEED_PHRASE)
    throw new Error("Unable to find seed phrase for Metamask. Please set the " + REACT_APP_SEED_PHRASE + " variable");

  return process.env.REACT_APP_SEED_PHRASE;
};

export const setupMetamask = async (browser: Browser): Promise<Dappeteer> => {
  const seedPhrase = getMetamaskSeedPhrase();

  const metamask = await dappeteer.setupMetamask(browser, { seed: seedPhrase });
  await metamask.switchNetwork("rinkeby");

  return metamask;
};

export const connectWallet = async (page: Page, metamask: Dappeteer) => {
  // Connect button
  await clickElement(page, ".connect-button");
  // Metamask/Wallet Connect modal window
  await clickElement(page, ".web3modal-provider-wrapper");
  // Approve connecting the wallet
  await metamask.approve();
};

export const getByTestId = async (page: Page, testId: string): Promise<ElementHandle> => {
  const document = await getDocument(page);
  return await queries.getByTestId(document, testId);
};

/**
 * Determine if the given selector exists on the page, without waiting for it to appear.
 *
 * @param page Puppeteer page
 * @param selector the selector representing the element, in the format of: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors
 * @returns true if it exists
 */
export const selectorExists = async (page: Page, selector: string): Promise<boolean> => {
  return !!(await page.$(selector));
};

/**
 * If we wait for the selector to appear and it appears within the timeout, then it exists.
 *
 * @param page Puppeteer page
 * @param selector the selector representing the element, in the format of: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors
 * @returns true if it exists
 */
export const waitSelectorExists = async (page: Page, selector: string): Promise<boolean> => {
  try {
    await page.waitForSelector(selector);
    return true;
  } catch (e) {
    console.info("Encountered error when waiting for selector (" + selector + "): " + e);
    return false;
  }
};

export const getSelectorTextContent = async (page: Page, selector: string): Promise<string> => {
  return await page.evaluate(el => el.textContent.trim(), await page.$(selector));
};
