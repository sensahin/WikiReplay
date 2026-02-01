'use client';

import React from 'react';

export interface InfoboxData {
  type: string;
  data: Record<string, { text?: string; number?: number; links?: Array<{ text: string; page?: string }> }>;
}

interface InfoboxRendererProps {
  infoboxes: InfoboxData[];
  showImages?: boolean;
}

// Mapping of common field names to more readable labels
const labelMappings: Record<string, string> = {
  birth_date: 'Born',
  death_date: 'Died',
  birth_place: 'Birthplace',
  death_place: 'Place of death',
  birth_name: 'Birth name',
  other_names: 'Other names',
  occupation: 'Occupation',
  nationality: 'Nationality',
  citizenship: 'Citizenship',
  known_for: 'Known for',
  notable_works: 'Notable works',
  spouse: 'Spouse',
  children: 'Children',
  parents: 'Parents',
  relatives: 'Relatives',
  education: 'Education',
  alma_mater: 'Alma mater',
  awards: 'Awards',
  website: 'Website',
  years_active: 'Years active',
  genre: 'Genre',
  instrument: 'Instruments',
  label: 'Labels',
  associated_acts: 'Associated acts',
  founded: 'Founded',
  founder: 'Founder',
  headquarters: 'Headquarters',
  area_served: 'Area served',
  key_people: 'Key people',
  products: 'Products',
  services: 'Services',
  revenue: 'Revenue',
  num_employees: 'Employees',
  industry: 'Industry',
  type: 'Type',
  location: 'Location',
  coordinates: 'Coordinates',
  established: 'Established',
  population: 'Population',
  area: 'Area',
  elevation: 'Elevation',
  timezone: 'Time zone',
  country: 'Country',
  region: 'Region',
  capital: 'Capital',
  official_languages: 'Official languages',
  government: 'Government',
  leader_title: 'Leader title',
  leader_name: 'Leader',
  currency: 'Currency',
  calling_code: 'Calling code',
  iso_code: 'ISO code',
  directed_by: 'Directed by',
  produced_by: 'Produced by',
  written_by: 'Written by',
  starring: 'Starring',
  music: 'Music by',
  cinematography: 'Cinematography',
  editing: 'Edited by',
  studio: 'Production company',
  distributor: 'Distributed by',
  released: 'Release date',
  runtime: 'Running time',
  budget: 'Budget',
  box_office: 'Box office',
  language: 'Language',
  preceded_by: 'Preceded by',
  followed_by: 'Followed by',
};

// Fields to skip (usually metadata or already handled)
const skipFields = new Set([
  'image',
  'image_size',
  'imagesize',
  'image_caption',
  'caption',
  'alt',
  'image_alt',
  'image2',
  'image3',
]);

// Fields that should be displayed as the title
const titleFields = ['name', 'title', 'official_name', 'native_name', 'common_name'];

function formatLabel(key: string): string {
  // Check if we have a mapping
  const mapped = labelMappings[key.toLowerCase()];
  if (mapped) return mapped;

  // Convert snake_case to Title Case
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: { text?: string; number?: number; links?: Array<{ text: string; page?: string }> }): string {
  if (value.text) return value.text;
  if (value.number !== undefined) return value.number.toString();
  if (value.links && value.links.length > 0) {
    return value.links.map((l) => l.text).join(', ');
  }
  return '';
}

const InfoboxRenderer: React.FC<InfoboxRendererProps> = ({ infoboxes, showImages = false }) => {
  if (!infoboxes || infoboxes.length === 0) return null;

  return (
    <div className="space-y-4">
      {infoboxes.map((infobox, index) => {
        const data = infobox.data;
        const entries = Object.entries(data);

        // Find title
        let title = '';
        for (const field of titleFields) {
          if (data[field]?.text) {
            title = data[field].text;
            break;
          }
        }

        // Find image
        const imageField = data.image || data.image_file;
        const imageCaption = data.image_caption || data.caption;
        let imageUrl = '';
        if (showImages && imageField?.text) {
          const imageName = imageField.text.replace(/^(File:|Image:)/i, '');
          // Use Wikipedia's thumbnail service
          imageUrl = `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(imageName)}?width=280`;
        }

        // Filter out metadata and title fields
        const displayEntries = entries.filter(([key]) => {
          const lowerKey = key.toLowerCase();
          if (skipFields.has(lowerKey)) return false;
          if (titleFields.includes(lowerKey)) return false;
          return true;
        });

        return (
          <aside
            key={index}
            className="bg-white/[0.03] border border-white/10 rounded-lg overflow-hidden"
          >
            {/* Title */}
            {title && (
              <div className="bg-white/[0.05] px-4 py-3 border-b border-white/10">
                <h3 className="text-base font-semibold text-white/90 text-center">
                  {title}
                </h3>
                {infobox.type && (
                  <p className="text-[10px] uppercase tracking-wider text-white/40 text-center mt-1">
                    {infobox.type.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            )}

            {/* Image */}
            {imageUrl && (
              <div className="px-4 py-3 border-b border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={imageCaption?.text || title || 'Infobox image'}
                  className="w-full h-auto rounded"
                  loading="lazy"
                />
                {imageCaption?.text && (
                  <p className="text-xs text-white/50 text-center mt-2 italic">
                    {imageCaption.text}
                  </p>
                )}
              </div>
            )}

            {/* Data rows */}
            <div className="divide-y divide-white/5">
              {displayEntries.map(([key, value]) => {
                const formattedValue = formatValue(value);
                if (!formattedValue) return null;

                return (
                  <div key={key} className="flex">
                    <div className="w-[35%] px-3 py-2 bg-white/[0.02] text-[13px] text-white/60 font-medium">
                      {formatLabel(key)}
                    </div>
                    <div className="flex-1 px-3 py-2 text-[13px] text-white/80">
                      {formattedValue}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        );
      })}
    </div>
  );
};

export default InfoboxRenderer;
