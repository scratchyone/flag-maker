import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css';

const directions = { vertical: -1, horizontal: 1 };

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
export default function Recents() {
  const limit = 10;
  let [flags, setFlags] = useState([]);
  let router = useRouter();
  const pageNum = parseInt(router.query.offset || '0') / limit + 1;
  useEffect(async () => {
    const res = await fetch(
      'https://flag-dataset.scratchyone.workers.dev/flags?limit=' +
        limit +
        '&offset=' +
        (router.query.offset || 0)
    );
    console.log(router.query.offset);
    const flags = await res.json();
    setFlags(flags);
  }, [router.query.offset]);

  return (
    <div style={{ margin: '40px' }}>
      {(flags.flags || []).map((flag) => (
        <div
          style={{ maxWidth: '600px' }}
          key={flag.id}
          className={styles.flag}
        >
          {generateFlag(flag.colors, directions.horizontal, 6)}
        </div>
      ))}
      {pageNum > 1 && (
        <Link
          href={
            '/recents?offset=' + (parseInt(router.query.offset || '0') - 10)
          }
        >
          Prev
        </Link>
      )}{' '}
      <span>
        Page {pageNum} of {Math.ceil(flags.total / limit)}
      </span>{' '}
      {pageNum < Math.ceil(flags.total / limit) && (
        <Link
          href={
            '/recents?offset=' + (parseInt(router.query.offset || '0') + 10)
          }
        >
          Next
        </Link>
      )}
    </div>
  );
}
