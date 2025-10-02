"use client";

import truncateAddress from "@/utils/truncate-address";
import { useState } from "react";
import Image from "next/image";

interface CopyableOperatorAddressProps {
  operatorAddress: string;
}

export default function CopyableOperatorAddress({
  operatorAddress,
}: CopyableOperatorAddressProps) {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <div
      className="flex flex-row items-center cursor-pointer gap-2"
      onClick={() => {
        navigator.clipboard.writeText(operatorAddress);
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 1000);
      }}
    >
      <span className="text-xl font-base text-[#250054] mb-1">
        {truncateAddress(operatorAddress)}
      </span>
      {isCopied ? (
        <Image
          src="/res/images/check.svg"
          alt="copied"
          className="shrink-0 self-end mb-1"
          width={20}
          height={20}
        />
      ) : (
        <Image
          src="/res/images/clipboard.svg"
          alt="copy"
          className="shrink-0 self-end mb-1"
          width={20}
          height={20}
        />
      )}
    </div>
  );
}
