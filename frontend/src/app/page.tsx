import Intro from "@/components/intro/intro";
import Navbar from "@/components/navbar/navbar";
import Inner from "@/components/inner/inner";
import StakeWithUs from "@/components/stake-with-us/stake-with-us";
import Footer from "@/components/footer/footer";

export default function Home() {
    return (
        <div className="flex flex-col items-center relative overflow-hidden h-screen w-full">
            <div className="flex flex-col w-full items-center relative overflow-x-hidden overflow-y-scroll ml-0 h-screen rounded-0 bg-white transition-all duration-250">
                <Navbar />
                <Intro />
                <Inner />
                <StakeWithUs />
                <Footer />
            </div>
        </div>
    );
}
