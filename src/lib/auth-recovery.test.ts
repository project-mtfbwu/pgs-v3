import {afterEach,describe,expect,it} from "vitest";
import {createRecoveryGrant,hasOtpAuthenticationMethod,verifyRecoveryGrant} from "@/lib/auth-recovery";

const secret="test-auth-flow-secret-with-at-least-32-characters";
const token=(amr:Array<{method:string}>)=>`x.${Buffer.from(JSON.stringify({amr})).toString("base64url")}.y`;

describe("signed recovery flow",()=>{
  afterEach(()=>delete process.env.AUTH_FLOW_SECRET);
  it("accepts only a fresh grant tied to the same user and access token",()=>{
    process.env.AUTH_FLOW_SECRET=secret;const now=1_800_000_000_000;const access=token([{method:"otp"}]);const grant=createRecoveryGrant("user-a",access,now);
    expect(grant).toBeTruthy();expect(verifyRecoveryGrant(grant??undefined,"user-a",access,now+60_000)).toBe(true);
    expect(verifyRecoveryGrant(grant??undefined,"user-b",access,now+60_000)).toBe(false);
    expect(verifyRecoveryGrant(grant??undefined,"user-a",`${access}changed`,now+60_000)).toBe(false);
    expect(verifyRecoveryGrant(grant??undefined,"user-a",access,now+601_000)).toBe(false);
    expect(verifyRecoveryGrant(grant??undefined,"user-a",access,now-1_000)).toBe(false);
  });
  it("recognizes recovery/OTP AMR and rejects ordinary password sessions",()=>{
    expect(hasOtpAuthenticationMethod(token([{method:"recovery"}]))).toBe(true);
    expect(hasOtpAuthenticationMethod(token([{method:"otp"}]))).toBe(true);
    expect(hasOtpAuthenticationMethod(token([{method:"password"}]))).toBe(false);
  });
  it("fails closed without a production secret",()=>expect(createRecoveryGrant("user-a",token([{method:"otp"}]))).toBeNull());
});
