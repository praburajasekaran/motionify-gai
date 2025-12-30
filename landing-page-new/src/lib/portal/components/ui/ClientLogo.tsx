'use client';

import React from 'react';
import { Client } from '@/lib/portal/types';

interface ClientLogoProps {
  client: Client;
  className?: string;
}

const ClientLogo: React.FC<ClientLogoProps> = ({ client, className = '' }) => {
  const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    client.name
  )}&background=random&color=fff&bold=true&size=64`;

  const logoSrc = client.logoUrl || placeholderUrl;

  return (
    <img
      src={logoSrc}
      alt={`${client.name} logo`}
      className={`rounded-md object-contain bg-white p-0.5 shadow-sm ${className}`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        if (target.src !== placeholderUrl) {
          target.onerror = null; // prevent infinite loop
          target.src = placeholderUrl;
        }
      }}
    />
  );
};

export default ClientLogo;

