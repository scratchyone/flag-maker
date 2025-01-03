import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { FaTimes } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';
import SketchPicker from 'react-color/lib/components/sketch/Sketch';
import ReactDOMServer from 'react-dom/server';
import classnames from 'classnames';
import canvasToBlob from 'async-canvas-to-blob';
import scrollToComponent from 'react-scroll-to-component';
import React from 'react';
import { saveAs } from 'file-saver';
import { encode, decode, logging_setup } from '../pkg/wasm_helpers_bg.js';
import { usePlausible } from 'next-plausible';
logging_setup();

const defaultFlags = [
  ['FF0018', 'FFA52C', 'FFFF41', '008018', '0000F9', '86007D'],
  ['55CDFC', 'F7A8B8', 'FFFFFF', 'F7A8B8', '55CDFC'],
  ['FFF430', 'FFFFFF', '9C59D1', '2D2D2D'],
  ['FF1B8D', 'FFDA00', '1BB3FF'],
  ['000000', 'A4A4A4', 'FFFFFF', '810081'],
  ['3AA63F', 'A8D47A', 'FFFFFF', 'AAAAAA', '000000'],
  ['D60270', 'D60270', '9B4F96', '0038A8', '0038A8'],
  ['D62900', 'FF9B55', 'FFFFFF', 'D461A6', 'A50062'],
  ['078d70', '27ceaa', '98e8c1', 'ffffff', '7bade2', '5049cc', '3d1a78'],
];
const directions = { vertical: -1, horizontal: 1 };
export default function Home() {
  const [colors, setColors] = useState([
    'FFFFFF',
    'FFFFFF',
    'FFFFFF',
    'FFFFFF',
    'FFFFFF',
  ]);
  const [preload, setPreload] = useState(true);
  const [direction, setDirection] = useState(directions.horizontal);
  const plausible = usePlausible();

  useEffect(() => {
    setPreload(false);
    setColors(defaultFlags.random().map((n) => n.toUpperCase()));
    setDirection(directions.horizontal);
    if (location.hash) {
      try {
        let json = JSON.parse(atob(location.hash.substr(1)));
        if (json.length > 0 && Object.values(directions).includes(json[0])) {
          setDirection(json[0]);
          setColors(arrayWithoutElementAtIndex(json, 0));
        } else {
          setDirection(directions.horizontal);
          setColors(json);
        }
      } catch (e) {
        try {
          let res = decode(location.hash.substr(1));
          setDirection(res[0]);
          setColors(arrayWithoutElementAtIndex(res, 0));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);
  return (
    <div className={styles.container}>
      <Head>
        <title>Flag Maker</title>
        <meta property="og:title" content="Flag Maker" />
        <meta
          property="og:description"
          content="Create striped flags easily with Flag Maker"
        />
        <meta
          name="description"
          content="Flag Maker lets you easily create striped flags and export them as PNG and SVG."
        />
        <link rel="icon" href="/favicon.ico" />
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-3TJ98MEM74"
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
  
            gtag('config', 'G-3TJ98MEM74');`,
          }}
        ></script>
      </Head>
      <h1 className={styles.header}>Flag Maker</h1>
      <div className={styles.holder}>
        <div className={styles.leftColumn}>
          <div className={styles.colorBoxes}>
            {colors.map((color, i) => (
              <FlagColorBox
                color={color}
                colors={colors}
                preload={preload}
                key={i}
                removeColor={() => {
                  const nc = arrayWithoutElementAtIndex(colors, i);
                  setColors(nc);
                  location.hash = encode(direction, nc);
                  // plausible('edit', { props: { type: 'remove' } });
                }}
                updateColor={(color) => {
                  setColors(Object.assign([], colors, { [i]: color }));
                }}
                onChangeComplete={() => {
                  location.hash = encode(direction, colors);
                  // plausible('edit', { props: { type: 'update' } });
                }}
              />
            ))}
          </div>
          <button
            className={classnames(styles.button, styles.addButton)}
            onClick={() => {
              const nc = [
                ...colors,
                defaultFlags.random().random().toUpperCase(),
              ];
              setColors(nc);
              location.hash = encode(direction, nc);
              // plausible('edit', { props: { type: 'add' } });
            }}
          >
            Add
          </button>
        </div>
        <div className={styles.rightColumn}>
          <ShimmerLoad preload={preload}>
            {preload ? (
              <div className={styles.flag} style={{ borderRadius: 16 }}>
                <svg
                  viewBox={`0 0 ${500} ${300}`}
                  xmlns="http://www.w3.org/2000/svg"
                />
              </div>
            ) : (
              <div className={styles.flag}>
                {generateFlag(colors, direction, 16)}
              </div>
            )}
          </ShimmerLoad>
          <div className={styles.exportButtons}>
            <button
              className={classnames(styles.button, styles.exportButton)}
              onClick={() => {
                downloadPNG(colors, direction);
                plausible('download', { props: { type: 'png' } });
              }}
            >
              Download as PNG
            </button>
            <button
              className={classnames(styles.button, styles.exportButton)}
              onClick={() => {
                downloadSVG(generateFlag(colors, direction), colors);
                plausible('download', { props: { type: 'svg' } });
              }}
            >
              Download as SVG
            </button>
          </div>
          <button
            className={classnames(styles.button, styles.directionButton)}
            onClick={() => {
              location.hash = encode(direction * -1, colors);
              setDirection(direction * -1);
              // plausible('edit', { props: { type: 'direction' } });
            }}
          >
            Change Stripe Direction
          </button>
        </div>
      </div>
    </div>
  );
}
// Avoid double logging
let lastColorSet = undefined;
function logDownload(colors) {
  if (
    typeof window !== 'undefined' &&
    location.hostname === 'flag.rachel.systems' &&
    lastColorSet !== colors
  ) {
    fetch('https://flag-dataset.scratchyone.workers.dev/flags', {
      method: 'POST',
      body: JSON.stringify(colors),
    }).then(() => {});
    lastColorSet = colors;
  }
}
function downloadSVG(svg, colors) {
  logDownload(colors);
  // plausible('download', { props: { type: 'svg' } });
  let xml = ReactDOMServer.renderToStaticMarkup(svg);
  var blob = new Blob([xml], { type: 'image/svg+xml' });
  saveAs(blob, 'flag.svg');
}
async function downloadPNG(colors, direction) {
  logDownload(colors);
  // plausible('download', { props: { type: 'png' } });
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1152;
  const ctx = canvas.getContext('2d');

  for (const i in colors) {
    const color = colors[i];
    ctx.fillStyle = '#' + color;
    if (direction == directions.horizontal)
      ctx.fillRect(
        0,
        i * (canvas.height / colors.length),
        canvas.width,
        canvas.height
      );
    else
      ctx.fillRect(
        i * (canvas.width / colors.length),
        0,
        canvas.width,
        canvas.height
      );
  }

  const blob = await canvasToBlob(canvas);
  saveAs(blob, 'flag.png');
}

function generateFlag(colors, direction, borderRadius) {
  const width = 500;
  const height = 300;
  const yOffset =
    direction == directions.horizontal ? height / colors.length : 0;
  const xOffset = direction == directions.vertical ? width / colors.length : 0;
  let lastColor = null;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ borderRadius: borderRadius }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {colors.map((color, i) => {
        const rect = color != lastColor && (
          <rect
            x={i * xOffset}
            y={i * yOffset}
            width={
              direction == directions.vertical
                ? `${100 - (100 / colors.length) * i}%`
                : '100%'
            }
            height={
              direction == directions.horizontal
                ? `${100 - (100 / colors.length) * i}%`
                : '100%'
            }
            fill={'#' + color}
            key={i}
          />
        );
        lastColor = color;
        return rect;
      })}
    </svg>
  );
}
function FlagColorBox({
  color,
  removeColor,
  updateColor,
  colors,
  onChangeComplete,
  preload,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const myRef = useRef(null);
  const executeScroll = () => scrollToComponent(myRef.current);

  useEffect(() => {
    if (pickerOpen && myRef.current) {
      executeScroll();
    }
  }, [pickerOpen, myRef]);
  return (
    <div
      className={styles.flagColorBox}
      style={pickerOpen ? { touchAction: 'none' } : {}}
    >
      <div className={styles.flagColorBoxFlex}>
        <ShimmerLoad preload={preload}>
          <div
            className={classnames(
              styles.colorSwatch,
              color.toUpperCase() == 'FFFFFF' &&
                !preload &&
                styles.whiteColorSwatch
            )}
            style={preload ? {} : { backgroundColor: '#' + color }}
            onClick={() => {
              setPickerOpen(true);
            }}
          />
        </ShimmerLoad>
        {pickerOpen && (
          <div
            className={styles.outsideClickCatcher}
            onClick={() => setPickerOpen(false)}
          />
        )}
        {pickerOpen && (
          <SketchPicker
            ref={myRef}
            color={color}
            onChange={({ hex }) => {
              if (pickerOpen) updateColor(hex.replace('#', '').toUpperCase());
            }}
            onChangeComplete={onChangeComplete}
            className={styles.colorPicker}
            presetColors={Array.from(
              new Set([
                ...colors.map((c) => `#${c}`),
                '#D0021B',
                '#F5A623',
                '#F8E71C',
                '#8B572A',
                '#7ED321',
                '#417505',
                '#BD10E0',
                '#9013FE',
                '#4A90E2',
                '#50E3C2',
                '#B8E986',
                '#000000',
                '#4A4A4A',
                '#9B9B9B',
                '#FFFFFF',
              ])
            )}
          />
        )}
        <ShimmerLoad
          preload={preload}
          style={{
            width: '7.4ch',
            height: '1em',
            borderRadius: '2px',
            color: 'transparent',
          }}
        >
          <div
            className={classnames(styles.colorHexCode)}
            onClick={() => setPickerOpen(true)}
          >
            {preload ? '' : '#' + color}
          </div>
        </ShimmerLoad>
        <ShimmerLoad
          preload={preload}
          style={{
            color: 'transparent',
            borderRadius: '3px',
          }}
        >
          <FaTimes
            className={classnames(styles.removeColor)}
            onClick={removeColor}
          />
        </ShimmerLoad>
      </div>
    </div>
  );
}
function ShimmerLoad({ preload, children, style }) {
  if (preload) {
    const StyledChildren = () =>
      React.Children.map(children, (child) =>
        React.cloneElement(child, {
          className: `${child.props.className || ''} ${styles.shimmer}`,
          style: {
            ...(child.props.style || {}),
            ...style,
          },
        })
      );

    return <StyledChildren />;
  } else {
    return children;
  }
}
const arrayWithoutElementAtIndex = function (arr, index) {
  return arr.filter(function (value, arrIndex) {
    return index !== arrIndex;
  });
};
Array.prototype.random = function () {
  return this[Math.floor(Math.random() * this.length)];
};
