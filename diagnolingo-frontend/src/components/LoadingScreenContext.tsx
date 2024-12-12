import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Define the types for the context value
interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Create the Context with a default value
const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Define props type for the provider
interface LoadingScreenProviderProps {
  children: ReactNode;
}

// Create a provider component
export const LoadingScreenProvider: React.FC<LoadingScreenProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
    </LoadingContext.Provider>
  );
};

// Custom hook to use the Loading context
export const useLoadingScreen = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoadingScreen must be used within a LoadingScreenProvider');
  }
  return context;
};

// Styles for loading screen container
const styles = StyleSheet.create({
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark semi-transparent background
  },
});
