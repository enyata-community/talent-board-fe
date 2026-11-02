import { getUser } from '@/api/user';
import Navbar from '@/components/navbar'
import { RequestTimeoutError } from '@/lib/withTimeout';
import { redirect } from 'next/navigation';
import React from 'react';
import Timeout from '../time-out';
import { AuthHydrator } from '@/components/authHydrator';

const WebsiteLayout = async ({ children }: { children: React.ReactNode }) => {
    let userData;
    try {
        userData = await getUser();
    } catch (err) {
        if (err instanceof RequestTimeoutError) {
            return (<Timeout />)
        }
        console.error("User fetch failed:", err);
        redirect("/");
    }
    // if (userData) {
    //     redirect("/dashboard");
    // }
    return (
        <AuthHydrator user={userData?.data?.user}>
            <div className='w-full'>
                <Navbar />
                <div>
                    {children}
                </div>
            </div>
        </AuthHydrator>
    )
}

export default WebsiteLayout
