import Image from "next/image";
import "@/../public/css/index/intro.css";

export default function Intro() {
    return (
        <div className="intro-main-wrapper" id="intro-main-wrapper">
            <div className="intro-main-background-content">
                <div className="animate-star-3d"></div>
                <div className="animate-star orbit-1"></div>
                <div className="animate-star orbit-2"></div>
                <div className="animate-star orbit-3"></div>
                <div className="animate-star orbit-4"></div>
                <div className="animate-star orbit-5"></div>
                <div className="animate-star orbit-6"></div>
                <Image
                    src="/res/images/intro.svg"
                    alt="intro"
                    width={1440}
                    height={525}
                />
            </div>
            <div className="intro-main-wrapper-title-wrapper">
                <div>THE VALIDATOR'S</div>
                <div>GUIDE TO THE GALAXY</div>
            </div>
            <div className="intro-main-wrapper-description-wrapper">
                <div>
                    node101 | CosmosHub Validatier showcases the validators'
                    behaviors,
                </div>
                <div>contributions, and impact within the Cosmos ecosystem</div>
            </div>
        </div>
    );
}
