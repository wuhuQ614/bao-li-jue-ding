const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const SOURCE = path.join('C:\\Users\\33397\\Desktop\\新建文件夹', '寒门贵子的资本与困境.pptx');
const OUTPUT = path.join('C:\\Users\\33397\\Desktop\\新建文件夹', '寒门贵子的资本与困境_动画版.pptx');

async function main() {
  const data = fs.readFileSync(SOURCE);
  if (!data || data.length < 100) { console.error('File empty or missing'); process.exit(1); }
  const zip = await JSZip.loadAsync(data);

  const transitions = [
    `<p:transition spd="slow" advTm="1800"><p:optionalBlack transition="fade"/></p:transition>`,
    `<p:transition spd="slow" advTm="1600"><p:push dir="l"/></p:transition>`,
    `<p:transition spd="slow" advTm="1600"><p:wipe spiral="false" dir="d"/></p:transition>`,
    `<p:transition spd="slow" advTm="1500"><p:zoom transition="inScreenCenter"/></p:transition>`,
    `<p:transition spd="slow" advTm="1600"><p:push dir="u"/></p:transition>`,
    `<p:transition spd="slow" advTm="1500"><p:glitter side="b" dir="t"/></p:transition>`,
    `<p:transition spd="slow" advTm="1600"><p:wipe spiral="false" dir="l"/></p:transition>`,
    `<p:transition spd="slow" advTm="1500"><p:optionalBlack transition="fade"/></p:transition>`,
    `<p:transition spd="slow" advTm="1600"><p:fracture/></p:transition>`,
    `<p:transition spd="slow" advTm="1500"><p:zoom transition="outRadial"/></p:transition>`,
    `<p:transition spd="slow" advTm="1600"><p:push dir="r"/></p:transition>`,
  ];

  const slideFiles = [];
  zip.forEach((relPath) => {
    const base = path.basename(relPath);
    if (/^slide\d+\.xml$/.test(base) && !relPath.includes('slideMaster') && !relPath.includes('slideLayout')) {
      slideFiles.push(relPath);
    }
  });
  slideFiles.sort();
  console.log('Found slides:', slideFiles.length);

  let slideIndex = 0;
  for (const relPath of slideFiles) {
    const content = await zip.file(relPath).async('string');
    const trans = transitions[slideIndex % transitions.length];
    let newContent;
    if (content.includes('<p:transition')) {
      newContent = content.replace(/<p:transition[^>]*>[\s\S]*?<\/p:transition>/, trans);
    } else if (content.includes('<p:timing>')) {
      newContent = content.replace('<p:timing>', trans + '\n  <p:timing>');
    } else if (content.includes('</p:cSld>')) {
      newContent = content.replace('</p:cSld>', '</p:cSld>\n  ' + trans);
    } else {
      newContent = content.replace('</p:presentation>', trans + '\n</p:presentation>');
    }
    zip.file(relPath, newContent);
    console.log('  Added transition to', relPath, '->', trans.substring(0, 60) + '...');
    slideIndex++;
  }

  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    const ctContent = await ctFile.async('string');
    if (!ctContent.includes('transition')) {
      const newCt = ctContent.replace(
        '</Types>',
        '<Default Extension="morph" ContentType="application/vnd.openxmlformats-officedocument.presentationml.transition"/>\n</Types>'
      );
      zip.file('[Content_Types].xml', newCt);
    }
  }

  const presFile = zip.file('ppt/presentation.xml');
  if (presFile) {
    let presContent = await presFile.async('string');
    if (!presContent.includes('p:sz') && !presContent.match(/<p:slideSize/)) {
      presContent = presContent.replace('<p:presentation>', '<p:presentation><p:slideSize cx="12192000" cy="6858000"/>');
    }
    zip.file('ppt/presentation.xml', presContent);
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  fs.writeFileSync(OUTPUT, buf);
  console.log('Done! Output:', OUTPUT);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
