import { ImageResponse } from 'next/og'

export const alt = 'WikiReplay - Watch Wikipedia Articles Evolve'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
              borderRadius: 16,
              marginRight: 24,
            }}
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.02em',
            }}
          >
            WikiReplay
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          Watch Wikipedia Articles Evolve
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center',
            maxWidth: 700,
            marginTop: 20,
          }}
        >
          Visualize the complete edit history of any article
        </div>

        {/* Decorative timeline bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 60,
            gap: 8,
          }}
        >
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              style={{
                width: 60,
                height: 8,
                borderRadius: 4,
                background: i < 7 
                  ? 'linear-gradient(90deg, #3b82f6, #7c3aed)' 
                  : 'rgba(255, 255, 255, 0.1)',
              }}
            />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
