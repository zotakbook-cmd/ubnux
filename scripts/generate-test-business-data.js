const fs=require("fs");
const path=require("path");
const root=path.join(__dirname,"..");
const dir=path.join(root,"data","businesses");
const configs=[
 {file:"SIWAN_BUSINESS_INDEX.JSON",id:"D001",slug:"siwan"},
 {file:"PATNA_BUSINESS_INDEX.JSON",id:"D002",slug:"patna"},
 {file:"GOPALGANJ_BUSINESS_INDEX.JSON",id:"D003",slug:"gopalganj"},
 {file:"SARAN_BUSINESS_INDEX.JSON",id:"D004",slug:"saran"},
 {file:"MUZAFFARPUR_BUSINESS_INDEX.JSON",id:"D005",slug:"muzaffarpur"}
];
const cats=[
 ["C0001","fashion","Fashion Store","fashion"],
 ["C0002","education","Education Centre","education"],
 ["C0003","coaching-institute","Coaching Institute","coaching"],
 ["C0004","restaurant","Restaurant","restaurant"],
 ["C0005","hotel","Hotel","hotel"],
 ["C0006","mobile-shop","Mobile Shop","mobile"],
 ["C0007","hospital","Hospital","hospital"],
 ["C0008","safety-training-institute","Safety Training Institute","safety"]
];
function slug(v){return v.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
for(const c of configs){
 const file=path.join(dir,c.file);
 const rows=JSON.parse(fs.readFileSync(file,"utf8"));
 const seen=new Set(rows.map(x=>x.Business_Slug));
 for(let i=rows.length+1;i<=1205;i++){
   const [cid,cslug,type,kw]=cats[(i-1)%cats.length];
   const title=`${c.slug[0].toUpperCase()+c.slug.slice(1)} ${type} ${i}`;
   const bs=slug(title);
   if(seen.has(bs)) continue;
   rows.push({
     Business_Title:title,
     Category_Id:cid,
     District_Id:c.id,
     Business_Id:`${c.id}${String(i).padStart(5,"0")}`,
     Business_Slug:bs,
     Business_Rating:Number((4+((i*7)%10)/10).toFixed(1)),
     Business_Review:10+(i*13)%491,
     Business_Status:i%3===0?"Listed":"Verified",
     Business_Keywords:[`${c.slug} ${kw}`,kw,"local business"],
     Business_Seo_Url:`https://ubnux.com/in/bihar/${c.slug}/${cslug}/${bs}/`
   });
   seen.add(bs);
 }
 fs.writeFileSync(file,JSON.stringify(rows,null,2)+"\n");
 console.log(c.file,rows.length);
}
