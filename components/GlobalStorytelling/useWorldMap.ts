"use client";

import { useEffect } from "react";
import { select } from "d3-selection";
import { geoMercator, geoPath } from "d3-geo";
import { json } from "d3-fetch";
import { feature } from "topojson-client";

type Region = { name: string; coords: [number, number]; color: string; clients: string[] };

const keyRegions: Region[] = [
  { name: 'North America', coords: [-100, 40], color: '#06b6d4', clients: ['Tech Giants','SaaS Leaders','Fortune 500'] },
  { name: 'Europe', coords: [10, 50], color: '#8b5cf6', clients: ['EU Agencies','UK Brands','Nordic Startups'] },
  { name: 'India', coords: [78, 22], color: '#f59e0b', clients: ['Tech Hubs','E-commerce','EdTech'] },
  { name: 'Southeast Asia', coords: [105, 10], color: '#14b8a6', clients: ['APAC Brands','Fintech','Gaming'] },
  { name: 'Middle East', coords: [50, 28], color: '#c084fc', clients: ['Dubai Media','Gulf Ventures','Tourism'] },
];

export function useWorldMap(svgSelector: string, containerSelector: string) {
  useEffect(() => {
    const svg = select(svgSelector);
    const container = document.querySelector(containerSelector) as HTMLElement | null;
    if (!container || svg.empty()) return;

    const width = container.offsetWidth;
    const height = window.innerWidth < 640 ? 350 : (window.innerWidth < 1024 ? 400 : 500);

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet').attr('height', height);

    const projection = geoMercator().scale(width / 6.5).translate([width / 2, height / 1.6]);
    const path = geoPath().projection(projection);

    const tooltip = select('body').append('div')
      .style('position','absolute')
      .style('background','rgba(15,23,42,.95)')
      .style('color','#fff')
      .style('padding','12px 16px')
      .style('borderRadius','12px')
      .style('fontSize','14px')
      .style('pointerEvents','none')
      .style('opacity','0')
      .style('backdropFilter','blur(8px)')
      .style('border','1px solid rgba(255,255,255,.1)')
      .style('boxShadow','0 8px 32px rgba(0,0,0,.4)')
      .style('zIndex','1000')
      .style('transition','opacity .2s')
      .style('fontFamily','Inter, sans-serif');

    let destroyed = false;

    json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then((world: any) => {
        if (destroyed) return;
        const countries = feature(world, world.objects.countries) as any;
        svg.append('g').selectAll('path')
          .data(countries.features)
          .enter()
          .append('path')
          .attr('d', (d: any) => path(d) as string)
          .attr('fill', 'rgba(255,255,255,.03)')
          .attr('stroke', 'rgba(255,255,255,.1)')
          .attr('stroke-width', .5)
          .on('mouseover', function() { select(this).attr('fill','rgba(255,255,255,.08)').attr('stroke','rgba(255,255,255,.3)'); })
          .on('mouseout', function() { select(this).attr('fill','rgba(255,255,255,.03)').attr('stroke','rgba(255,255,255,.1)'); });

        const markers = svg.append('g');
        keyRegions.forEach((r) => {
          const [x,y] = projection(r.coords)!;
          markers.append('circle').attr('cx',x).attr('cy',y).attr('r',20).attr('fill', r.color).attr('opacity', .2).style('animation','regionPulse 2s ease-in-out infinite');
          markers.append('circle')
            .attr('cx',x).attr('cy',y).attr('r',8).attr('fill', r.color)
            .attr('stroke','rgba(255,255,255,.8)').attr('stroke-width',2)
            .style('cursor','pointer')
            .style('filter',`drop-shadow(0 0 8px ${r.color})`)
            .on('mouseover', (event: MouseEvent) => {
              tooltip.style('opacity','1').html(
                `<div style="font-weight:600;margin-bottom:6px;font-size:15px;">${r.name}</div>
                 <div style="opacity:.8;font-size:12px;">${r.clients.map(c=>`• ${c}`).join('<br>')}</div>
                 <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.1);font-size:11px;opacity:.6;">Click to view case studies →</div>`
              ).style('left', `${event.pageX+15}px`).style('top', `${event.pageY-15}px`);
            })
            .on('mouseout', () => { tooltip.style('opacity','0'); })
            .on('mousemove', (event: MouseEvent) => { tooltip.style('left', `${event.pageX+15}px`).style('top', `${event.pageY-15}px`); })
            .on('click', () => { /* placeholder for navigation */ });

          svg.append('text').attr('x',x).attr('y',y+30).attr('text-anchor','middle')
            .attr('fill','rgba(255,255,255,.7)').attr('font-size','12px').attr('font-weight','500')
            .style('fontFamily','Inter, sans-serif').text(r.name);
        });

        const connections: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[1,4]];
        connections.forEach(([i,j], idx) => {
          const s = projection(keyRegions[i].coords)!;
          const e = projection(keyRegions[j].coords)!;
          const mid = [(s[0]+e[0])/2, (s[1]+e[1])/2 - 50];
          svg.append('path')
            .attr('class','aurora-path')
            .attr('d', `M ${s[0]},${s[1]} Q ${mid[0]},${mid[1]} ${e[0]},${e[1]}`)
            .attr('fill','none')
            .attr('stroke','url(#auroraGradient1)')
            .attr('stroke-width',1.5)
            .attr('opacity',.3)
            .attr('stroke-dasharray','5,5')
            .style('animation', `auroraFlow ${8+idx}s ease-in-out infinite`)
            .style('animationDelay', `${idx*.5}s` as any);
        });
      })
      .catch(() => {
        if (destroyed) return;
        svg.append('text')
          .attr('x', width/2).attr('y', height/2).attr('text-anchor','middle')
          .attr('fill','rgba(255,255,255,.5)').attr('font-size','16px')
          .style('fontFamily','Inter, sans-serif')
          .text('Interactive world map loading...');
      });

    const onResize = () => {
      const newWidth = container.offsetWidth;
      const newHeight = window.innerWidth < 640 ? 350 : (window.innerWidth < 1024 ? 400 : 500);
      svg.attr('viewBox', `0 0 ${newWidth} ${newHeight}`).attr('height', newHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      destroyed = true;
      window.removeEventListener('resize', onResize);
      tooltip.remove();
      svg.selectAll('*').remove();
    };
  }, [svgSelector, containerSelector]);
}



