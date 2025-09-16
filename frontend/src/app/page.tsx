import Intro from "@/components/intro/intro";
import Navbar from "@/components/navbar/navbar";
import Inner from "@/components/inner/inner";

export default function Home() {
    return (
        <div className="all-wrapper">
            <div className="all-main-wrapper">
                <Navbar />
                <Intro />
                <Inner />
            </div>
        </div>
    );
}
