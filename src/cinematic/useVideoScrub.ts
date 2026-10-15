import { useEffect, useRef, useState, type RefObject } from 'react';
import * as MP4Box from 'mp4box';
type Frame = { ts:number; blob:Blob };
const LERP_TAU=8, SNAP=.002, LRU_MAX=24, LEAD=24, WATCHDOG=60000;
export function useVideoScrub(src:string, container:RefObject<HTMLDivElement>) {
  const video=useRef<HTMLVideoElement>(null), canvas=useRef<HTMLCanvasElement>(null);
  const [progress,setProgress]=useState(0),[canvasLive,setCanvasLive]=useState(false),[failed,setFailed]=useState(false);
  useEffect(()=>{
    const el=video.current!, surface=canvas.current!, ctx=surface.getContext('2d')!;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const abort=new AbortController();
    let disposed=false,reverted=false,ready=false,painted=false,dur=0,current=0,last=performance.now(),raf=0,span=1;
    let decoder:VideoDecoder|null=null,parser:any=null,watchdog:ReturnType<typeof setTimeout>|undefined;
    let bank:Frame[]=[], lru=new Map<number,ImageBitmap|null>();
    let lastPaint=-1,lastProgress=-1;
    const resize=()=>{span=Math.max(1,container.current!.offsetHeight-window.innerHeight);};
    const metadata=()=>{dur=Number.isFinite(el.duration)?el.duration:0;};
    const error=()=>setFailed(true);
    const clearBank=()=>{for(const bitmap of lru.values())bitmap?.close();lru.clear();bank=[];};
    const closeDecoder=()=>{if(decoder&&decoder.state!=='closed')decoder.close();};
    const revert=()=>{if(disposed)return;reverted=true;ready=false;setCanvasLive(false);abort.abort();if(decoder?.state!=='closed')decoder?.close();parser?.stop();clearBank();};
    const nearest=(time:number)=>{let lo=0,hi=bank.length-1;const target=time*1e6;while(lo<hi){const mid=(lo+hi)>>1;if(bank[mid].ts<target)lo=mid+1;else hi=mid;}return lo>0&&Math.abs(bank[lo-1].ts-target)<Math.abs(bank[lo].ts-target)?lo-1:lo;};
    const warm=(index:number)=>{
      if(index<0||index>=bank.length||lru.has(index))return;
      lru.set(index,null);
      createImageBitmap(bank[index].blob).then(bitmap=>{
        if(disposed||reverted||!lru.has(index)){bitmap.close();return;}
        lru.set(index,bitmap);
      }).catch(()=>{lru.delete(index);});
    };
    const paint=(time:number)=>{
      const i=nearest(time);
      for(let n=i-1;n<=i+2;n++)warm(n);
      const bitmap=lru.get(i);
      if(bitmap&&lastPaint!==i){ctx.drawImage(bitmap,0,0,surface.width,surface.height);lastPaint=i;if(!painted){painted=true;setCanvasLive(true);}}
      if(lru.has(i)){const item=lru.get(i)!;lru.delete(i);lru.set(i,item);}
      while(lru.size>LRU_MAX){const first=lru.keys().next().value!;lru.get(first)?.close();lru.delete(first);}
    };
    const tick=(now:number)=>{
      if(disposed)return;
      const dt=Math.min(.1,(now-last)/1000);last=now;
      const p=Math.max(0,Math.min(1,(window.scrollY-(container.current?.offsetTop||0))/span));
      if(p!==lastProgress){setProgress(p);lastProgress=p;}
      if(dur>0){const target=p*dur;current=reduced.matches?target:current+(target-current)*(1-Math.exp(-dt*LERP_TAU));if(Math.abs(target-current)<SNAP)current=target;
        if(ready)paint(current);else if(!el.seeking&&Math.abs(el.currentTime-current)>.01)el.currentTime=Math.min(current,Math.max(0,dur-.001));}
      raf=requestAnimationFrame(tick);
    };
    const build=async()=>{
      if(disposed||reduced.matches||!('VideoDecoder' in window))return;
      watchdog=setTimeout(revert,WATCHDOG);
      try {
        const response=await fetch(src,{signal:abort.signal});if(!response.ok)throw Error('Video fetch failed');
        const buffer=await response.arrayBuffer();
        if(disposed||reverted)return;
        const extracted=await new Promise<{track:any,samples:any[],description?:ArrayBuffer}>((resolve,reject)=>{
          parser=MP4Box.createFile();let track:any,all:any[]=[];let description:ArrayBuffer|undefined;
          parser.onError=reject;
          parser.onReady=(info:any)=>{
            track=info.videoTracks[0];if(!track){reject(Error('No video track'));return;}
            const entry=parser.getTrackById(track.id).mdia.minf.stbl.stsd.entries[0];
            const box=entry.avcC||entry.hvcC||entry.vpcC||entry.av1C;
            if(box){const stream=new MP4Box.DataStream(undefined,0,MP4Box.DataStream.BIG_ENDIAN);box.write(stream);description=stream.buffer.slice(8);}
            parser.setExtractionOptions(track.id,null,{nbSamples:LEAD});parser.start();
          };
          parser.onSamples=(_id:number,_user:unknown,samples:any[])=>{all.push(...samples);if(all.length>=track.nb_samples){parser.stop();resolve({track,samples:all,description});}};
          Object.assign(buffer,{fileStart:0});parser.appendBuffer(buffer);parser.flush();
        });
        dur=extracted.track.duration/extracted.track.timescale;
        let generation=0;
        const decode=async(software:boolean)=>{
          const attempt=++generation;
          let decodeError:Error|null=null,pending=0,encoding:Promise<void>[]=[];
          const output=document.createElement('canvas');output.width=extracted.track.video.width;output.height=extracted.track.video.height;
          const context=output.getContext('2d')!;
          decoder=new VideoDecoder({error:e=>{decodeError=e;},output:frame=>{
            if(disposed||reverted){frame.close();return;}
            pending++;const ts=frame.timestamp;context.drawImage(frame,0,0);frame.close();
            encoding.push(new Promise<void>(resolve=>output.toBlob(blob=>{if(blob&&!disposed&&!reverted&&attempt===generation)bank.push({ts,blob});pending--;resolve();},'image/webp',.82)));
          }});
          decoder.configure({codec:extracted.track.codec,codedWidth:output.width,codedHeight:output.height,description:extracted.description,hardwareAcceleration:software?'prefer-software':'prefer-hardware'});
          for(const sample of extracted.samples){
            while(!disposed&&!reverted&&!decodeError&&decoder.decodeQueueSize+pending>=LEAD)await new Promise(r=>setTimeout(r,8));
            if(disposed||reverted)throw Error('Cancelled');if(decodeError)throw decodeError;
            decoder.decode(new EncodedVideoChunk({type:sample.is_sync?'key':'delta',timestamp:Math.round(sample.cts*1e6/sample.timescale),duration:Math.round(sample.duration*1e6/sample.timescale),data:sample.data}));
          }
          await decoder.flush();await Promise.all(encoding);if(decodeError)throw decodeError;
          decoder.close();
        };
        try{await decode(false);}catch(e){if(disposed||reverted)throw e;closeDecoder();bank=[];await decode(true);}
        if(disposed||reverted)return;
        bank.sort((a,b)=>a.ts-b.ts);ready=bank.length>0;clearTimeout(watchdog);
      } catch {if(!disposed)revert();} finally {clearTimeout(watchdog);}
    };
    el.addEventListener('loadedmetadata',metadata);el.addEventListener('error',error);
    window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);
    resize();metadata();raf=requestAnimationFrame(tick);
    if(document.readyState==='complete')void build();else window.addEventListener('load',build,{once:true});
    return()=>{disposed=true;abort.abort();cancelAnimationFrame(raf);clearTimeout(watchdog);window.removeEventListener('load',build);window.removeEventListener('resize',resize);window.removeEventListener('orientationchange',resize);el.removeEventListener('loadedmetadata',metadata);el.removeEventListener('error',error);if(decoder&&decoder.state!=='closed')decoder.close();parser?.stop();clearBank();};
  },[src,container]);
  return {video,canvas,progress,canvasLive,failed};
}
