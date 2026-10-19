from pathlib import Path
import json, hashlib, datetime, subprocess, re
w=Path(__file__).resolve().parent
base=w.parent
sha="dec2edcad7f4796440daff2c1e59dde6ca7981c1"
r=json.loads((w/"w2x-commercial-document-full-close-result.json").read_text(encoding="utf-8-sig"))
repo=w/"crm-w2x-document-upload-uncertain"
assert subprocess.check_output(["git","-C",str(repo),"rev-parse","HEAD"],text=True).strip()==sha
assert not subprocess.check_output(["git","-C",str(repo),"status","--porcelain"],text=True).strip()
log=(w/"w2x-commercial-document-full-browser.txt").read_text(encoding="utf-8-sig")
passed=r["browser_exit"]==0 and re.search(r"(?m)^\s*704 passed ",log) is not None and re.search(r"(?m)^\s*\d+ failed",log) is None
own=json.loads((w/"w2x-document-download-lifetime-checkpoint.json").read_text(encoding="utf-8"))
assert own["sha"]==sha and own["published"] and own["checks"]["browser"]==73
assert own["checks"]["build"]=="PASS66" and own["checks"]["lint"]=="PASS" and own["checks"]["scan"]=="PASS"
queue=json.loads((w/"w2x-commercial-document-full-queue.txt").read_text(encoding="utf-8-sig"))
assert (queue["total"],queue["reviewed_partial"],queue["unreconciled"],queue["release_ready"])==(342,15,327,0)
p=w/"w2x-commercial-document-full-checkpoint.json"
j=json.loads(p.read_text(encoding="utf-8"))
j.update(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),status="OWN704_FULL_BUILD66_LINT_QUEUE_SCAN_PASS_VISUAL_PARTIAL_AUTH_NOT_RUN" if passed else "FULL704_FAILURE_PRESERVED_REVIEW_REQUIRED",browser_exit=r["browser_exit"],full_suite_pass=passed,publication=r.get("publication","PENDING"),handoffs=r.get("handoffs",[]),next="RESUME_EXISTING_CLAIM6181243189_GATED_REPRO5921;NO_DUPLICATE_OR_GREEN_RERUN" if passed else "INSPECT_FULL704_FAILURE_CAUSE;NO_BLIND_RETRY;CONTINUE_INDEPENDENT_UNIT")
if passed:j.update(passed=704,failed=0)
j["evidence"]=[{"path":str(w/f),"sha256":hashlib.sha256((w/f).read_bytes()).hexdigest()} for f in ["w2x-commercial-document-full-browser.txt","w2x-commercial-document-full-collection.txt","w2x-commercial-document-full-queue.txt","w2x-document-download-published.bundle"]]
def save(p,j):
 tmp=p.with_suffix(p.suffix+".tmp");tmp.write_text(json.dumps(j,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");tmp.replace(p)
save(p,j)
for rel in ["outputs/CRM-recuperacion-inventario.json","work/canonical-next-composition-metadata.json","work/current-authorized-execution-unit.json","work/w2x-current-execution-unit.json"]:
 x=base/rel;z=json.loads(x.read_text(encoding="utf-8-sig"));t=z if rel.endswith("w2x-current-execution-unit.json") else z.setdefault("w2x_recovery",{})
 t["active_commercial_unit"]={"checkpoint":str(p),"claim":6181197466,"sha":sha,"branch":own["branch"],"status":j["status"],"published":True,"next":j["next"]}
 t["closed_commercial_document_coverage"]=str(p);save(x,z)
print(json.dumps({"full_suite_pass":passed,"source":sha,"status":j["status"],"publication":j["publication"]}))
