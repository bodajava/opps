'use client';

import { useState } from 'react';
import { generateSessionId } from '@/lib/utils';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('sessionId');
  if (!id) {
    id = generateSessionId();
    localStorage.setItem('sessionId', id);
  }
  return id;
}

export function useSession() {
  const [sessionId] = useState<string>(getOrCreateSessionId);

  return { sessionId };
}
