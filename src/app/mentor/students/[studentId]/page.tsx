import { redirect } from "next/navigation";
export default async function MentorStudentPage({params}:{params:Promise<{studentId:string}>}){const {studentId}=await params;redirect(`/admin/students/${studentId}`)}
