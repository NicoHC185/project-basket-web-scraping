import { NextResponse } from "next/server";
import puppeteer from "puppeteer-extra";
import Adblocker from "puppeteer-extra-plugin-adblocker";
import UserAgent from "user-agents";
import { JSDOM } from "jsdom";
import { ElementHandle, EventEmitter, Page, PageEvents } from "puppeteer";
import { IGameResult, IInfoPlayer } from "interfaces";
import { getElement, initialBrowser } from "app/api/utils";

const url = `https://www.basketball-reference.com/teams`;

const getInfoPlayer = ({ row }: { row: Element }): IInfoPlayer => {
  const number = row.querySelector('[data-stat="number"]')?.textContent;
  const player = row.querySelector('[data-stat="player"]')?.textContent;
  const playerRef = row.querySelector("a")?.href;
  const playerPos = row.querySelector('[data-stat="pos"]')?.textContent;
  const playerCountry = row.querySelector(
    '[data-stat="birth_country"]'
  )?.textContent;
  const infoPlayer: IInfoPlayer = {
    number,
    name: player,
    position: playerPos,
    country: playerCountry,
    href: playerRef,
  };
  return infoPlayer;
};

const getGameResult = async ({
  page,
}: {
  page: Page;
}): Promise<IGameResult[]> => {
  const document = await getElement(page, `#timeline_results`);
  const result = [...document.querySelectorAll("ul>li")]
    .filter((el) => el.className === "result")
    .map((el) => {
      const textSplit = String(el.textContent).split(",");
      const dateSplit = textSplit[0]
        .replace(/(\r\n|\n|\r)/gm, "")
        .split(".")[1]
        .split(" ");
      const teamsSplit = textSplit[1].split(" ");
      const date = `${dateSplit[1]} ${dateSplit[2]}`;
      const teams = [teamsSplit[1], teamsSplit.slice(-1)[0]];
      const result = teamsSplit[2].match(/\d+/g);
      const score = String(textSplit[2])
        .replace(/(\r\n|\n|\r)/gm, "")
        .split(" ")[1]
        .split("-");
      return {
        date,
        teams,
        result,
        score,
      };
    });
  return result;
};

const Puppeteer = async ({ url }: { url: string }) => {
  const browser = await initialBrowser();
  const page = await browser.newPage();
  const userAgent = new UserAgent();
  await page.setUserAgent(userAgent.toString());
  await page.setViewport({
    width: 1920,
    height: 1080,
  });
  await page.goto(url);
  const result = await getGameResult({ page: page });
  await browser.close();
  return result;
};

export async function POST(request: Request) {
  const { codeTeam, year } = await request.json();
  const response = await Puppeteer({ url: `${url}/${codeTeam}/${year}.html` });
  return NextResponse.json(response);
}
