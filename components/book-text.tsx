'use client';
import {lazy,Suspense} from 'react';
import type {PlayLinks} from './book-text-render';
// The Markdown parser is a large dependency, so it loads on its own the first time formatted text is shown.
// Until then the plain text is visible, so nothing is ever blank.
const Formatted=lazy(()=>import('./book-text-render'));
export default function BookText({text,plays}:{text:string;plays?:PlayLinks}){return <Suspense fallback={<div className="book-text book-text-plain"><p>{text}</p></div>}><Formatted text={text} plays={plays}/></Suspense>}
