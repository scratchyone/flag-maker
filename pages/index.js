import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { FaTimes } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';
import { SketchPicker } from 'react-color';
import ReactDOMServer from 'react-dom/server';
import Canvg, { presets } from 'canvg';
import classnames from 'classnames';
import canvasToBlob from 'async-canvas-to-blob';
import scrollToComponent from 'react-scroll-to-component';
import React from 'react';
import { saveAs } from 'file-saver';
import { encode, decode, logging_setup } from '../pkg/wasm_helpers_bg.js';

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
  const [colors, setColors] = useState([]);
  const [direction, setDirection] = useState(directions.horizontal);
  useEffect(() => {
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
          content="Create striped flags easily with Flag Maker"
        />
        <link rel="icon" href="/favicon.ico" />
        <script
          defer
          data-domain="flag.rachel.systems"
          src="/js/script.js"
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
                key={i}
                removeColor={() => {
                  const nc = arrayWithoutElementAtIndex(colors, i);
                  setColors(nc);
                  location.hash = encode(direction, nc);
                }}
                updateColor={(color) => {
                  setColors(Object.assign([], colors, { [i]: color }));
                }}
                onChangeComplete={() => {
                  location.hash = encode(direction, colors);
                }}
              />
            ))}
          </div>
          <button
            className={styles.addButton}
            onClick={() => {
              const nc = [
                ...colors,
                defaultFlags.random().random().toUpperCase(),
              ];
              setColors(nc);
              location.hash = encode(direction, nc);
            }}
          >
            Add
          </button>
        </div>
        <div className={styles.rightColumn}>
          <div className={styles.flag}>
            {generateFlag(colors, direction, 6)}
          </div>
          <div className={styles.exportButtons}>
            <button
              className={styles.exportButton}
              onClick={() => downloadPNG(generateFlag(colors, direction))}
            >
              Download as PNG
            </button>
            <button
              className={styles.exportButton}
              onClick={() => downloadSVG(generateFlag(colors, direction))}
            >
              Download as SVG
            </button>
          </div>
          <button
            className={styles.directionButton}
            onClick={() => {
              location.hash = encode(direction * -1, colors);
              setDirection(direction * -1);
            }}
          >
            Change Stripe Direction
          </button>
        </div>
      </div>
    </div>
  );
}
function downloadSVG(svg) {
  let xml = ReactDOMServer.renderToStaticMarkup(svg);
  var blob = new Blob([xml], { type: 'image/svg+xml' });
  saveAs(blob, 'flag.svg');
}
async function downloadPNG(svg) {
  let xml = ReactDOMServer.renderToStaticMarkup(svg);
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1152;
  const ctx = canvas.getContext('2d');
  let v = await Canvg.from(ctx, xml, presets.offscreen());
  await v.render();
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
        <div
          className={classnames(
            styles.colorSwatch,
            color.toUpperCase() == 'FFFFFF' && styles.whiteColorSwatch
          )}
          style={{ backgroundColor: '#' + color }}
          onClick={() => {
            setPickerOpen(true);
          }}
        />
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
        <div
          className={styles.colorHexCode}
          onClick={() => setPickerOpen(true)}
        >
          #{color}
        </div>
        <FaTimes className={styles.removeColor} onClick={removeColor} />
      </div>
    </div>
  );
}
const arrayWithoutElementAtIndex = function (arr, index) {
  return arr.filter(function (value, arrIndex) {
    return index !== arrIndex;
  });
};
Array.prototype.random = function () {
  return this[Math.floor(Math.random() * this.length)];
};
