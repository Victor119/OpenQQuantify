import os
import numpy as np
import pandas as pd
from scipy import signal
from scipy.stats import skew, kurtosis
from scipy.io import wavfile
import re

def load_signal(file_path, sample_rate=1e6):
    """Load the signal from a .dat or .wav file."""
    try:
        if file_path.endswith(".dat"):
            signal_data = np.fromfile(file_path, dtype=np.float32)
            
        elif file_path.endswith(".wav"):
            sample_rate, signal_data = wavfile.read(file_path)
            if signal_data.ndim > 1:
                # Dacă este stereo, folosim doar primul canal
                signal_data = signal_data[:, 0]
            signal_data = signal_data.astype(np.float32) / np.max(np.abs(signal_data))  # Normalizare
            
        else:
            print(f"Unknown file type for {file_path}.")
            return None, None

        return signal_data, sample_rate

    except FileNotFoundError:
        print(f"File {file_path} not found.")
        return None, None

def extract_features(signal_data, sample_rate):
    """Calculate the signal characteristics."""
    features = {}

    # Time-Domain Features
    features['mean'] = np.mean(signal_data)
    features['variance'] = np.var(signal_data)
    features['skewness'] = skew(signal_data)
    features['kurtosis'] = kurtosis(signal_data)
    
    # Frequency-Domain Features
    freqs, psd = signal.welch(signal_data, sample_rate, nperseg=1024)
    features['spectral_centroid'] = np.sum(freqs * psd) / np.sum(psd)
    features['spectral_bandwidth'] = np.sqrt(
        np.sum(((freqs - features['spectral_centroid'])**2) * psd) / np.sum(psd)
    )
    features['peak_frequency'] = freqs[np.argmax(psd)]
    features['power_spectral_density'] = np.max(psd)

    # Modulation-Specific Features
    phase = np.unwrap(np.angle(signal.hilbert(signal_data)))
    features['phase_variance'] = np.var(phase)
    features['symbol_rate'] = np.mean(np.abs(np.diff(phase))) / (2 * np.pi * sample_rate)

    # Time-Frequency Features (Spectrogram-based)
    f, t, Sxx = signal.spectrogram(signal_data, sample_rate)
    features['spectrogram_entropy'] = -np.sum(Sxx * np.log(Sxx + 1e-10)) / np.sum(Sxx)
    
    return features

def process_dataset(data_path):
    """Process all files in a dataset directory and generate a CSV with features."""
    dataset = []
    for class_dir in os.listdir(data_path):
        class_path = os.path.join(data_path, class_dir)
        if os.path.isdir(class_path):
            for file in os.listdir(class_path):
                file_path = os.path.join(class_path, file)
                #print(f"Processing file: {file_path}")
                
                if file_path.endswith(".dat"):
                    match = re.search(r'(\d+)(?=\.\w+$)', file_path)
                    if match:
                        sample_rate = int(match.group(1))  # Convert to int
                    else:
                        sample_rate = 0
                    
                    signal_data, sample_rate = load_signal(file_path, sample_rate)
                    
                elif file_path.endswith(".wav"):
                    signal_data, sample_rate = load_signal(file_path)

                
                if signal_data is not None:
                    features = extract_features(signal_data, sample_rate)
                    features['label'] = class_dir
                    dataset.append(features)
    
    # Crearea unui DataFrame și salvarea într-un fișier CSV
    df = pd.DataFrame(dataset)
    csv_path = os.path.join(data_path, "features_validation.csv")
    df.to_csv(csv_path, index=False)
    print(f"Features saved to {csv_path}")

if __name__ == "__main__":
    data_path = "C:\\Users\\victor\\Documents\\OpenQuantify_unpaid_25_11_2024\\week_3\\dataset\\validation"
    process_dataset(data_path)
