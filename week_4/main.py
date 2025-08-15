import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.svm import SVC
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_score, recall_score, f1_score
import joblib

import numpy as np
from scipy import signal
from scipy.stats import skew, kurtosis
from scipy.io import wavfile
import os
import re

def load_signal(file_path, sample_rate):
    """Load the signal from a .dat or .wav file"""
    try:
        if file_path.endswith(".dat"):
            signal_data = np.fromfile(file_path, dtype=np.float32)
        elif file_path.endswith(".wav"):
            sample_rate, signal_data = wavfile.read(file_path)
            if signal_data.ndim > 1:
                # Daca este stereo, folosim doar primul canal
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
    """Calculate the signal characteristics"""
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

    # Placeholder pentru alte caracteristici
    # Modulation-Specific Features
    phase = np.unwrap(np.angle(signal.hilbert(signal_data)))
    features['phase_variance'] = np.var(phase)
    features['symbol_rate'] = np.mean(np.abs(np.diff(phase))) / (2 * np.pi * sample_rate)

    # Time-Frequency Features (Spectrogram-based)
    f, t, Sxx = signal.spectrogram(signal_data, sample_rate)
    features['spectrogram_entropy'] = -np.sum(Sxx * np.log(Sxx + 1e-10)) / np.sum(Sxx)
    
    return features

feature_names = [
    'mean', 'variance', 'skewness', 'kurtosis',
    'spectral_centroid', 'spectral_bandwidth', 'peak_frequency',
    'power_spectral_density', 'phase_variance', 'symbol_rate',
    'spectrogram_entropy'
]

# Load features
df_train = pd.read_csv('C:\\Users\\victor\\Documents\\OpenQuantify_unpaid_25_11_2024\\week_3\\dataset\\train\\features_train.csv')

X_train = df_train.drop('label', axis=1)
y_train = df_train['label']

#label encoding
le = LabelEncoder()
y_train_encoded = le.fit_transform(y_train)

# Split data
X_train_split, X_val, y_train_split, y_val = train_test_split(
    X_train, y_train_encoded, test_size=0.2, random_state=42
)

# Feature scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train_split)
X_val_scaled = scaler.transform(X_val)

svm = SVC(kernel='rbf', C=1, gamma='scale', random_state=42)
svm.fit(X_train_scaled, y_train_split)

# Save trained models
joblib.dump(svm, 'svm_classifier.joblib')
joblib.dump(le, 'label_encoder.joblib')
joblib.dump(scaler, 'scaler.joblib')

#Validation
y_pred_svm = svm.predict(X_val_scaled)

#print(y_pred_svm)

#print(y_val)

#print(le.classes_)

#Performance evaluation
print("Classification report SVM:")
print(classification_report(y_val, y_pred_svm, labels=le.transform(le.classes_), zero_division=1))

accuracy = accuracy_score(y_val, y_pred_svm)
precision = precision_score(y_val, y_pred_svm, average='weighted')
recall = recall_score(y_val, y_pred_svm, average='weighted')
f1 = f1_score(y_val, y_pred_svm, average='weighted')

print(f"Accuracy: {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall: {recall:.4f}")
print(f"F1-Score: {f1:.4f}")

print("Confusion Matrix SVM:")
print(confusion_matrix(y_val, y_pred_svm))


# Develop Classification Script
# Load models and encoder
svm = joblib.load('svm_classifier.joblib')
le = joblib.load('label_encoder.joblib')
scaler = joblib.load('scaler.joblib')

def classify_signal(signal_data, sample_rate):
    # Replace with actual feature extraction implementation
    features = extract_features(signal_data, sample_rate) 
    
    #X = np.array([features[col] for col in features if col != 'label']).reshape(1, -1)
    X = pd.DataFrame([features], columns=feature_names)
    
    X = X.fillna(0)
    
    X_scaled = scaler.transform(X)
    prediction = svm.predict(X_scaled)
    label = le.inverse_transform(prediction)
    return label[0]

#path to the file to classify
data_path = "C:\\Users\\victor\\Documents\\OpenQuantify_unpaid_25_11_2024\\week_3\\dataset\\train\\LF_AM\\am_signal_30000_1.0_1000_32000.dat"

sample_rate = None

# extract last numeric value from the file name
if data_path.endswith(".dat"):
    match = re.search(r'(\d+)(?=\.\w+$)', data_path)
    if match:
        sample_rate = int(match.group(1))  # Convert to int
else:
    sample_rate = 0
    
signal_data, sample_rate = load_signal(data_path, sample_rate)

signal_data = np.fromfile(data_path, dtype=np.float32)

if signal_data is not None:
    classification = classify_signal(signal_data, sample_rate=sample_rate)
    print(f"Classified as: {classification}")