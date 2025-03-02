import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid file format' },
        { status: 400 }
      );
    }

    console.log('Received file:', file.name);

    // Save the uploaded file temporarily
    const tempFilePath = `/tmp/${file.name}`;
    console.log('Saving file to:', tempFilePath);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(tempFilePath, fileBuffer);
    console.log('File saved successfully');

    // Define resolutions
    const resolutions = [240, 360, 480, 720, 1080];

    // Process video into different resolutions
    for (const resolution of resolutions) {
      console.log(`Processing resolution: ${resolution}p`);
      const outputFilePath = `/tmp/${resolution}p_${file.name}`;
      try {
        // Test locally with: ffmpeg -i input.mp4 -vf "scale=trunc(oh*a/2)*2:480" output_480p.mp4
        const { stdout, stderr } = await execPromise(`ffmpeg -y -i ${tempFilePath} -vf "scale=trunc(oh*a/2)*2:${resolution}" ${outputFilePath}`);
        console.log(`FFmpeg stdout: ${stdout}`);
        console.error(`FFmpeg stderr: ${stderr}`);
      } catch (ffmpegError) {
        console.error(`FFmpeg error: ${ffmpegError}`);
        throw new Error(`FFmpeg processing failed for ${resolution}p`);
      }
      console.log(`Processed ${resolution}p video`);

      // Upload processed video to Supabase
      console.log(`Uploading ${resolution}p video to Supabase`);
      const { error } = await supabase.storage
        .from('videos')
        .upload(`videos/${resolution}p_${file.name}`, fs.createReadStream(outputFilePath), {
                duplex: 'half', // It's required with the recent Node.js versions. There is not any information anywhere.
        });

      if (error) {
        throw new Error(`Failed to upload ${resolution}p video: ${error.message}`);
      }
      console.log(`Uploaded ${resolution}p video successfully`);
    }

    // Define output paths for DASH and HLS
    const dashOutputPath = `/tmp/dash_${file.name}`;
    const hlsOutputPath = `/tmp/hls_${file.name}`;

    // Create output directories for DASH and HLS
    fs.mkdirSync(dashOutputPath, { recursive: true });
    fs.mkdirSync(hlsOutputPath, { recursive: true });

    // Generate DASH manifest and segments
    console.log('Generating DASH manifest and segments');
    await execPromise(`ffmpeg -y -i ${tempFilePath} -map 0 -map 0 -c:a aac -c:v libx264 -b:v:0 1500k -b:v:1 1000k -s:v:1 640x360 -f dash ${dashOutputPath}/manifest.mpd`);
    console.log('DASH manifest and segments generated');

    // Generate HLS manifest and segments
    console.log('Generating HLS manifest and segments');
    await execPromise(`ffmpeg -y -i ${tempFilePath} -map 0 -map 0 -c:a aac -c:v libx264 -b:v:0 1500k -b:v:1 1000k -s:v:1 640x360 -f hls ${hlsOutputPath}/playlist.m3u8`);
    console.log('HLS manifest and segments generated');

    // Upload DASH manifest and segments to Supabase
    console.log('Uploading DASH manifest and segments to Supabase');
    const dashFiles = fs.readdirSync(dashOutputPath);
    for (const dashFile of dashFiles) {
      const { error } = await supabase.storage
        .from('videos')
        .upload(`dash/${dashFile}`, fs.createReadStream(`${dashOutputPath}/${dashFile}`), {
            duplex: 'half', // It's required with the recent Node.js versions. There is not any information anywhere.
    });

      if (error) {
        throw new Error(`Failed to upload DASH file ${dashFile}: ${error.message}`);
      }
    }
    console.log('DASH manifest and segments uploaded successfully');

    // Upload HLS manifest and segments to Supabase
    console.log('Uploading HLS manifest and segments to Supabase');
    const hlsFiles = fs.readdirSync(hlsOutputPath);
    for (const hlsFile of hlsFiles) {
      const { error } = await supabase.storage
        .from('videos')
        .upload(`hls/${hlsFile}`, fs.createReadStream(`${hlsOutputPath}/${hlsFile}`), {
            duplex: 'half', // It's required with the recent Node.js versions. There is not any information anywhere.
    });

      if (error) {
        throw new Error(`Failed to upload HLS file ${hlsFile}: ${error.message}`);
      }
    }
    console.log('HLS manifest and segments uploaded successfully');

    // Clean up temporary files
    console.log('Cleaning up temporary files');
    await fs.promises.unlink(tempFilePath);
    for (const resolution of resolutions) {
      await fs.promises.unlink(`/tmp/${resolution}p_${file.name}`);
    }
    fs.rmdirSync(dashOutputPath, { recursive: true });
    fs.rmdirSync(hlsOutputPath, { recursive: true });
    console.log('Cleanup complete');

    return NextResponse.json({ message: 'Video processed and uploaded successfully' });
  } catch (error) {
    console.error('Error uploading file:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}