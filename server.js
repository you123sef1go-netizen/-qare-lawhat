import express from "express";
import multer from "multer";
import fs from "node:fs";
import os from "node:os";
const app=express(), PORT=process.env.PORT||10000, KEY=process.env.ASSEMBLYAI_API_KEY;
app.use(express.static("public"));
app.get("/api/health",(_q,r)=>r.json({ok:true,configured:Boolean(KEY)}));
const upload=multer({dest:os.tmpdir(),limits:{fileSize:250*1024*1024},fileFilter:(_q,f,cb)=>cb(/\\.(mp3|m4a|wav|aac|ogg|flac|mp4|webm)$/i.test(f.originalname)?null:new Error("صيغة غير مدعومة"),/\\.(mp3|m4a|wav|aac|ogg|flac|mp4|webm)$/i.test(f.originalname))});
app.post("/api/transcribe",upload.single("audio"),async(req,res)=>{
 if(!KEY)return res.status(500).json({error:"مفتاح AssemblyAI غير مضبوط على الخادم"});
 if(!req.file)return res.status(400).json({error:"اختر ملفاً صوتياً"});
 const p=req.file.path;
 try{
  const up=await fetch("https://api.assemblyai.com/v2/upload",{method:"POST",headers:{authorization:KEY,"content-type":"application/octet-stream"},body:fs.createReadStream(p),duplex:"half"});
  const u=await up.json();if(!up.ok)throw Error(u.error||"فشل رفع الملف");
  const tr=await fetch("https://api.assemblyai.com/v2/transcript",{method:"POST",headers:{authorization:KEY,"content-type":"application/json"},body:JSON.stringify({audio_url:u.upload_url,language_code:"ar",speech_model:"universal-2",punctuate:false,format_text:false})});
  const t=await tr.json();if(!tr.ok)throw Error(t.error||"فشل بدء التحويل");
  res.json({id:t.id,status:t.status});
 }catch(e){res.status(502).json({error:e.message||"خطأ في التحويل"});}
 finally{fs.promises.unlink(p).catch(()=>{});}
});
app.get("/api/transcripts/:id",async(req,res)=>{
 if(!KEY)return res.status(500).json({error:"مفتاح AssemblyAI غير مضبوط"});
 if(!/^[a-zA-Z0-9-]+$/.test(req.params.id))return res.status(400).json({error:"معرّف غير صالح"});
 try{const r=await fetch("https://api.assemblyai.com/v2/transcript/"+req.params.id,{headers:{authorization:KEY}});const d=await r.json();if(!r.ok)return res.status(r.status).json({error:d.error||"تعذر جلب النتيجة"});res.json({id:d.id,status:d.status,text:d.text||"",error:d.error||null});}
 catch{res.status(502).json({error:"تعذر الاتصال بخدمة الصوت"});}
});
app.use((e,_q,r,_n)=>r.status(400).json({error:e.message||"تعذر استقبال الملف"}));
app.listen(PORT,"0.0.0.0",()=>console.log("Server listening on "+PORT));
