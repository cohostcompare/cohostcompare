import math
FX=1.52  # A$ per US$
ADS_DAY=25; ADS_MO=ADS_DAY*30.4
CPC=3.0; AD_CONV=0.03; ORG_CONV=0.015; ACCEPT=0.35
PRO=99; ENT=400; UNLOCK=99
TOOLS=210  # A$/month core running costs
def ramp(t): return [0,0.5,0.8][t] if t<3 else 1.0
def org(t,cap): return cap*(1-math.exp(-t/10)) if t>0 else 0
def run(nat_start=None, nat_mgrs=260, months=24, ads_core=ADS_MO, ads_nat=ADS_MO):
    regions={'core':dict(start=1,mgrs=200,contact=0.89,cap=1800,ads=ads_core)}
    if nat_start: regions['nat']=dict(start=nat_start,mgrs=nat_mgrs,contact=0.85,cap=2200,ads=ads_nat)
    st={k:dict(claimed=0.0) for k in regions}
    pro=0.0; trials=[]  # (end_month, count)
    rows=[]; cum=0; cumrev=0; cumcost=0
    setup=0
    for m in range(1,months+1):
        req=0; newclaims=0; cost=TOOLS; adspend=0
        for k,r in regions.items():
            t=m-r['start']+1
            if t<1: continue
            if k=='nat':
                cost+=120
                if t==1: setup+=1350; cost+=1350
            s=st[k]
            ads_req=(r['ads']/CPC)*AD_CONV*ramp(min(t,3) if t<3 else 3)
            visits=org(t,r['cap'])
            q=ads_req+visits*ORG_CONV
            req+=q; adspend+=r['ads']
            unclaimed=r['mgrs']-s['claimed']
            c=0
            if t==1: c+=r['mgrs']*r['contact']*0.12*0.6
            if t==2: c+=r['mgrs']*r['contact']*0.12*0.4
            c+=q*3*(unclaimed/r["mgrs"])*0.15   # unclaimed managers who get a real request
            c+=unclaimed*0.005
            c=min(c,unclaimed); s['claimed']+=c; newclaims+=c
            s['req']=q
        claimed=sum(s['claimed'] for s in st.values())
        # Pro: founding trial for claims up to month 4 (31 Jan 2027), converts 12% after 3 months; later claims convert 5%
        if m<=4: trials.append((m+3,newclaims*0.12))
        else: trials.append((m+2,newclaims*0.05))
        pro=pro*0.96+sum(n for e,n in trials if e==m)
        ent=(1 if m>=15 else 0)+(1 if nat_start and m>=nat_start+9 else 0)
        accepts=req*ACCEPT
        per=accepts/max(claimed,1)*1.5
        overflow=min(0.5,max(0,(per-1)/8))
        free_share=max(0,1-pro/max(claimed,1))
        unlocks=accepts*min(0.9,claimed/ (sum(r['mgrs'] for k,r in regions.items() if m>=r['start'])) *1.5)*free_share*overflow*0.7
        rev=pro*PRO+ent*ENT+unlocks*UNLOCK
        fees=rev*0.0175+ (pro+ent+unlocks)*0.30
        total_cost=cost+adspend+fees
        cum+=rev-total_cost; cumrev+=rev; cumcost+=total_cost
        rows.append(dict(m=m,req=req,claimed=claimed,pro=pro,ent=ent,unlocks=unlocks,rev=rev,cost=total_cost,net=rev-total_cost,cum=cum,cumrev=cumrev,cumcost=cumcost))
    return rows
def show(name,rows):
    print(f"\n== {name}")
    print("m | req/mo | claimed | pro | unlocks | rev/mo | cost/mo | net/mo | cum rev | cum cost | cum net")
    for r in rows:
        if r['m'] in (3,6,9,12,18,24):
            print(f"{r['m']} | {r['req']:.0f} | {r['claimed']:.0f} | {r['pro']:.1f} | {r['unlocks']:.1f} | {r['rev']:.0f} | {r['cost']:.0f} | {r['net']:.0f} | {r['cumrev']:.0f} | {r['cumcost']:.0f} | {r['cum']:.0f}")
A=run(); show('A: current regions only',A)
B=run(nat_start=1); show('B: all Australia now',B)
C=run(nat_start=7); show('C: all Australia month 7 (Apr 2027)',C)
D=run(ads_core=ADS_MO*2); show('A2: current regions, ads doubled',D)
