import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import MindMitraApp from '../components/MindCareApp';
import '../app/globals.css';
import './native.css';

if (Capacitor.isNativePlatform() || navigator.userAgent.includes('MindMitraAndroid')) {
  document.documentElement.classList.add('capacitor-native');
}

const root = document.getElementById('root');

if (!root) throw new Error('MindMitra could not find its application root.');

createRoot(root).render(
  <React.StrictMode>
    <MindMitraApp />
  </React.StrictMode>,
);
