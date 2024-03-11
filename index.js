import "dotenv/config";
import { VKApi, ConsoleLogger } from "node-vk-sdk";
import { writeFile, readFile } from "node:fs/promises";

const api = new VKApi({
  logger: new ConsoleLogger(),
  token: process.env.VK_TOKEN,
});

const PAGE_SIZE = 100;
let offset = 0;
let count = PAGE_SIZE;
const posts = [];
while (offset < count) {
  try {
    console.log({ offset, count });
    const result = await api.wallGet({
      owner_id: process.env.VK_GROUP_ID,
      count: PAGE_SIZE,
      offset,
    });
    count = result.count;
    posts.push(...result.items);
  } catch (e) {
    console.error(e);
  }
  offset += PAGE_SIZE;
}

await writeFile("posts.json", JSON.stringify(posts, null, 2));

// const posts = JSON.parse(await readFile("posts.json"));

const renderImage = (sizes, alt) => {
  if (sizes == null) {
    return "";
  }
  const largest = [...sizes].sort(
    (a, b) => b.width + b.height - a.width - a.height,
  )[0];
  return `<img src="${largest.url}" alt="${alt}">`;
};

const renderLink = (link) =>
  link != null
    ? `<a href="${link.url}">${renderImage(link.photo?.sizes, link.photo?.text)}${link.title}</a>`
    : "";

const renderVideo = (video) => {
  if (video == null) {
    return "";
  }
  if (video.player == null) {
    return video.image != null
      ? renderImage(video.image, video.title)
      : video.title ?? "";
  }
  return `<iframe src="${video.player}"></iframe>`;
};

const renderPost = (post) => `
    ${post.text
      .split(/\n/)
      .map((paragraph, i) => {
        const tagName = i === 0 && paragraph.length <= 100 ? "h4" : "p";
        return `<${tagName}>${paragraph}</${tagName}>`;
      })
      .join("")}
    ${
      post.attachments
        ?.map(
          ({ photo, link, video }) => `
            ${renderImage(photo?.sizes, photo?.text)}
            ${renderLink(link)}
            ${renderVideo(video)}
        `,
        )
        .join("") ?? ""
    }
`;

await writeFile(
  "public/index.html",
  `
<!DOCTYPE html>  
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>КОС</title>
    <link rel="stylesheet" href="index.css">
    <link rel="shortcut icon" href="favicon.ico" type="image/x-icon">
    <script>
        document.addEventListener('keydown', function(event) {
            if (event.key === 'g') {
                document.body.classList.toggle('grid');
            }
        });
    </script>
</head>
<body>
    <h1>Комитет Общественной Самозащиты</h1>
    ${posts
      .map(
        (post) => `
        <article>
            ${renderPost(post)}
            ${post.copy_history != null ? `<blockquote>${renderPost(post.copy_history[0])}</blockquote>` : ""}
            <img class="solidarity" src="solidarity.svg" alt="Солидарность">
        </article>
    `,
      )
      .join("")}
</html>
`,
);
