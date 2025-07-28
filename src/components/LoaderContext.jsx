// components/LoaderContext.js
import { createContext, useContext, useState } from "react";
import { FourSquare, Mosaic, ThreeDot } from "react-loading-indicators"

const LoaderContext = createContext();

export const useLoader = () => useContext(LoaderContext);

export const LoaderProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  const showLoader = () => setIsLoading(true);
  const hideLoader = () => setIsLoading(false);

  return (
    <LoaderContext.Provider value={{ isLoading, showLoader, hideLoader }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-60 backdrop-blur-md">
         
            <ThreeDot color="#FFFFFF" size="medium" text="" textColor="" />
          
        </div>
      )}
    </LoaderContext.Provider>
  );
};
